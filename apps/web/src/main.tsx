import { RouterProvider } from '@tanstack/react-router'
import ReactDOM from 'react-dom/client'

import { getRouter } from './router'

const router = getRouter()
const rootElement = document.getElementById('app')

if (rootElement && !rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(<RouterProvider router={router} />)
}
