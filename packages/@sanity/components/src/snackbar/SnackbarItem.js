/* eslint-disable complexity */
import React from 'react'
import PropTypes from 'prop-types'
import CloseIcon from 'part:@sanity/base/close-icon'
import CheckCircleIcon from 'part:@sanity/base/circle-check-icon'
import WarningIcon from 'part:@sanity/base/warning-icon'
import ErrorIcon from 'part:@sanity/base/error-icon'
import InfoIcon from 'part:@sanity/base/info-icon'
import styles from './styles/SnackbarItem.css'
import Button from 'part:@sanity/components/buttons/default'

export default class SnackbarItem extends React.Component {
  static propTypes = {
    action: PropTypes.shape({
      title: PropTypes.string,
      icon: PropTypes.func,
      callback: PropTypes.func
    }),
    autoDismissTimeout: PropTypes.number,
    children: PropTypes.node,
    icon: PropTypes.oneOfType([PropTypes.string, PropTypes.node, PropTypes.bool]),
    isCloseable: PropTypes.bool,
    isOpen: PropTypes.bool.isRequired,
    isPersisted: PropTypes.bool,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    kind: PropTypes.oneOf(['info', 'warning', 'error', 'success']),
    title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    onDismiss: PropTypes.func,
    offset: PropTypes.number,
    onClose: PropTypes.func,
    onSetHeight: PropTypes.func,
    setAutoFocus: PropTypes.bool
  }

  constructor(props, context) {
    super(props, context)
    this.state = {
      isEntering: true
    }
    this._snackRef = React.createRef()
  }

  static defaultProps = {
    action: undefined,
    autoDismissTimeout: 4000,
    children: null,
    icon: null,
    isCloseable: true,
    isPersisted: false,
    kind: 'info',
    offset: null,
    onDismiss: () => {},
    onSetHeight: () => {},
    setAutoFocus: false
  }

  DEFAULT_ICONS = {
    info: <InfoIcon />,
    success: <CheckCircleIcon />,
    warning: <WarningIcon />,
    error: <ErrorIcon />
  }

  snackIcon = () => {
    const {icon, kind} = this.props
    if (typeof icon === 'boolean' && icon) return this.DEFAULT_ICONS[kind]
    if (typeof icon === 'object' || typeof icon === 'string') return icon
    return undefined
  }

  handleAutoDismissSnack = () => {
    const {autoDismissTimeout, isPersisted, id, onDismiss, onClose} = this.props
    if (!isPersisted) {
      this._dismissTimer = setTimeout(() => {
        if (onClose) onClose()
        onDismiss(id)
      }, autoDismissTimeout)
    }
  }

  handleMouseOver = () => {
    this.cancelAutoDismissSnack()
  }

  handleMouseLeave = () => {
    const {isPersisted} = this.props
    if (!isPersisted) {
      this.handleAutoDismissSnack()
    }
  }

  handleFocus = () => {
    this.cancelAutoDismissSnack()
  }

  handleBlur = () => {
    const {isPersisted} = this.props
    if (!isPersisted) {
      this.handleAutoDismissSnack()
    }
  }

  handleAction = () => {
    const {action, id, onDismiss} = this.props
    if (action && action.callback) action.callback()
    return onDismiss(id)
  }

  handleClose = () => {
    const {id, onClose, onDismiss} = this.props
    if (onClose) onClose()
    return onDismiss(id)
  }

  cancelAutoDismissSnack = () => {
    clearTimeout(this._dismissTimer)
  }

  componentDidMount() {
    const {onSetHeight, id, isPersisted, setAutoFocus} = this.props

    if (setAutoFocus) {
      this._snackRef.current.focus()
      this.cancelAutoDismissSnack()
    }

    const height = this._snackRef.current && this._snackRef.current.clientHeight
    onSetHeight(id, height)

    if (isPersisted) this.cancelAutoDismissSnack()
    else this.handleAutoDismissSnack()

    this._enterTimer = setTimeout(() => {
      this.setState({
        isEntering: false
      })
    }, 100)
  }

  componentWillUnmount() {
    clearTimeout(this._dismissTimer)
    clearTimeout(this._enterTimer)
  }

  render() {
    const {
      action,
      children,
      icon,
      id,
      isCloseable,
      isOpen,
      kind,
      title,
      subtitle,
      offset
    } = this.props

    const rootStyles = this.state.isEntering
      ? `${styles.root}`
      : `${styles.root} ${isOpen ? styles.showSnack : styles.dismissSnack}`
    const transition = `all 200ms ease-in-out`
    const role = () => {
      if (kind === 'success') return 'status'
      if (kind === 'info') return 'log'
      return 'alert'
    }
    return (
      <div
        aria-label={kind}
        aria-describedby={`snackbarTitle-${kind}-${id}`}
        role={role()}
        ref={this._snackRef}
        tabIndex="-1"
        className={rootStyles}
        style={{bottom: offset, transition: transition}}
        onMouseOver={() => this.handleMouseOver()}
        onMouseLeave={() => this.handleMouseLeave()}
        onFocus={() => this.handleFocus()}
        onBlur={() => this.handleBlur()}
        onKeyDown={e => e.key === 'escape' && this.handleAction()}
        data-kind={kind}
      >
        <div className={styles.inner}>
          <div className={styles.buttonsWrapper}>
            {action && (
              <div className={styles.actionButtonContainer}>
                <Button
                  // eslint-disable-next-line react/jsx-handler-names
                  onClick={() => this.handleAction()}
                  bleed
                  kind="simple"
                  style={{lineHeight: 'inherit'}}
                  padding="none"
                  ripple={false}
                >
                  {action.title}
                </Button>
              </div>
            )}
            {isCloseable && (
              <div className={styles.closeButtonContainer}>
                <Button
                  aria-label="Close"
                  onClick={this.handleClose}
                  bleed
                  kind="simple"
                  icon={CloseIcon}
                  padding="none"
                  ripple={false}
                />
              </div>
            )}
          </div>
          {icon && (
            <div role="img" aria-hidden className={styles.icon}>
              {this.snackIcon()}
            </div>
          )}
          <div className={styles.content}>
            <div id={`snackbarTitle-${kind}-${id}`} className={styles.title}>
              {title}
            </div>
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
            {children && <div className={styles.children}>{children}</div>}
          </div>
        </div>
      </div>
    )
  }
}
