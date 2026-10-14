import { Component, type ReactNode } from 'react'

interface StageBoundaryProps {
  fallback: ReactNode
  children: ReactNode
}

/**
 * Catches the 3D table failing -- no WebGL context (old or locked-down
 * browsers, GPU blocklists) or its code chunk failing to download -- and shows
 * `fallback` in its place, so the rest of the page keeps working instead of
 * the whole app unmounting.
 */
export class StageBoundary extends Component<StageBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
