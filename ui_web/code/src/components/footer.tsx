import { Container } from './container'

function Copyright() {
  return (
    <div className="text-sm/6 text-gray-500">
      &copy; {new Date().getFullYear()} My App
    </div>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-gray-200 py-8">
      <Container>
        <div className="flex justify-center">
          <Copyright />
        </div>
      </Container>
    </footer>
  )
}
