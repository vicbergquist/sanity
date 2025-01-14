import client from 'part:@sanity/base/client'
import {from, merge} from 'rxjs'
import {transactionsToEvents} from '@sanity/transaction-collator'
import {map, mergeMap, reduce, scan} from 'rxjs/operators'
import {getDraftId, getPublishedId} from '../../util/draftUtils'
import {omit} from 'lodash'
import jsonReduce from 'json-reduce'

const documentRevisionCache = Object.create(null)

const compileTransactions = (acc, curr) => {
  if (acc[curr.id]) {
    acc[curr.id].mutations = acc[curr.id].mutations.concat(curr.mutations)
    acc[curr.id].timestamp = curr.timestamp
  } else {
    acc[curr.id] = curr
  }
  return acc
}

const ndjsonToArray = ndjson => {
  return ndjson
    .toString('utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line))
}

const getHistory = (documentIds, options = {}) => {
  const ids = Array.isArray(documentIds) ? documentIds : [documentIds]
  const {time, revision} = options

  if (time && revision) {
    throw new Error(`getHistory can't handle both time and revision parameters`)
  }

  const dataset = client.clientConfig.dataset
  let url = `/data/history/${dataset}/documents/${ids.join(',')}`

  if (revision) {
    url = `${url}?revision=${revision}`
  } else {
    const timestamp = time || new Date().toISOString()
    url = `${url}?time=${timestamp}`
  }

  return client.request({url})
}

const getDocumentAtRevision = (documentId, revision) => {
  const cacheKey = `${documentId}@${revision}`
  if (!(cacheKey in documentRevisionCache)) {
    const dataset = client.clientConfig.dataset
    const url = `/data/history/${dataset}/documents/${documentId}?revision=${revision}`
    documentRevisionCache[cacheKey] = client.request({url}).then(result => result.documents[0])
  }

  return documentRevisionCache[cacheKey]
}

const getTransactions = documentIds => {
  const ids = Array.isArray(documentIds) ? documentIds : [documentIds]
  const dataset = client.clientConfig.dataset
  const url = `/data/history/${dataset}/transactions/${ids.join(',')}?excludeContent=true`
  return client.request({url}).then(ndjsonToArray)
}

function historyEventsFor(documentId) {
  const pairs = [getDraftId(documentId), getPublishedId(documentId)]

  const query = '*[_id in $documentIds]'

  const pastTransactions$ = from(getTransactions(pairs)).pipe(
    mergeMap(transactions => from(transactions)),
    map(trans => ({
      author: trans.author,
      documentIDs: pairs,
      id: trans.id,
      mutations: trans.mutations,
      timestamp: trans.timestamp
    })),
    reduce(compileTransactions, {})
  )

  const realtimeTransactions$ = client.observable.listen(query, {documentIds: pairs}).pipe(
    map(item => ({
      author: item.identity,
      documentIDs: pairs,
      id: item.transactionId,
      mutations: item.mutations,
      timestamp: item.timestamp
    })),
    scan(compileTransactions, {})
  )

  return merge(realtimeTransactions$, pastTransactions$).pipe(
    scan((prev, next) => {
      return {...prev, ...next}
    }, {}),
    map(transactions =>
      transactionsToEvents(pairs, Object.keys(transactions).map(key => transactions[key])).reverse()
    )
  )
}

const getAllRefIds = doc =>
  jsonReduce(
    doc,
    (acc, node) =>
      node && typeof node === 'object' && '_ref' in node && !acc.includes(node._ref)
        ? [...acc, node._ref]
        : acc,
    []
  )

function jsonMap(value, mapFn) {
  if (Array.isArray(value)) {
    return mapFn(value.map(item => map(item, mapFn)))
  }
  if (value && typeof value === 'object') {
    return mapFn(
      Object.keys(value).reduce((res, key) => {
        res[key] = jsonMap(value[key], mapFn)
        return res
      }, {})
    )
  }
  return mapFn(value)
}

const mapRefNodes = (doc, mapFn) =>
  jsonMap(doc, node => {
    return typeof node && typeof node === 'object' && typeof node._ref === 'string'
      ? mapFn(node)
      : node
  })

function restore(id, rev) {
  return from(getDocumentAtRevision(id, rev)).pipe(
    mergeMap(documentAtRevision => {
      const existingIdsQuery = getAllRefIds(documentAtRevision)
        .map(refId => `"${refId}": defined(*[_id=="${refId}"]._id)`)
        .join(',')

      return client.observable.fetch(`{${existingIdsQuery}}`).pipe(
        map(existingIds =>
          mapRefNodes(documentAtRevision, refNode => {
            const documentExists = existingIds[refNode._ref]
            return documentExists ? refNode : undefined
          })
        )
      )
    }),
    map(documentAtRevision =>
      // Remove _updatedAt and create a new draft from the document at given revision
      ({
        ...omit(documentAtRevision, '_updatedAt'),
        _id: getDraftId(id)
      })
    ),
    mergeMap(restoredDraft =>
      client.observable
        .transaction()
        .createOrReplace(restoredDraft)
        .commit()
    )
  )
}

export default function createHistoryStore() {
  return {
    getDocumentAtRevision,
    getHistory,
    getTransactions,
    historyEventsFor,
    restore
  }
}
