import client from 'part:@sanity/base/client'

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

  return client.request({url}).catch(error => {
    console.warn('getHistory failed', url) // eslint-disable-line no-console
    throw new Error('getHistory failed', error)
  })
}

const getTransactions = documentIds => {
  const ids = Array.isArray(documentIds) ? documentIds : [documentIds]
  const dataset = client.clientConfig.dataset
  const url = `/data/history/${dataset}/transactions/${ids.join(',')}`

  return client.request({url}).catch(error => {
    console.warn('getTransactions failed', url) // eslint-disable-line no-console
    throw new Error('getTransactions failed', error)
  })
}

export default function createHistoryStore() {
  return {
    getHistory,
    getTransactions
  }
}