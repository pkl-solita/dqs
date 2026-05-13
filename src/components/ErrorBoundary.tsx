import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
     
    console.error('Unhandled error in component tree', error, info)
  }

  private handleReload = (): void => {
    this.setState({ error: null })
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="error-fallback" role="alert">
          <h1>Something went wrong</h1>
          <p>The app hit an unexpected error and could not continue.</p>
          <pre>{this.state.error.message}</pre>
          <button type="button" onClick={this.handleReload}>
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
