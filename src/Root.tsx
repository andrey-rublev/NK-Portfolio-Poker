import { Suspense, lazy } from 'react'
import App from './App.tsx'

// The site is one page; /estimathon is the only other route. The host serves
// index.html for every path, so the path picks which one to render.
const EstimathonPage = lazy(() => import('./estimathon/EstimathonPage.tsx'))

const path = window.location.pathname.slice(import.meta.env.BASE_URL.length - 1)
const onEstimathon = /^\/estimathon\/?$/.test(path)

export default function Root() {
  return onEstimathon ? (
    <Suspense fallback={null}>
      <EstimathonPage />
    </Suspense>
  ) : (
    <App />
  )
}
