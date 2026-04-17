import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from './useAuth'

export function GoogleAuthButton() {
  const { isLoggedIn, user, logout, setCredential } = useAuth()

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive profile email',
    onSuccess: async (tokenResponse) => {
      const res = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
      )
      const info = await res.json()
      setCredential(tokenResponse.access_token, {
        email: info.email,
        name: info.name,
        picture: info.picture,
      })
    },
    onError: (err) => console.error('Login failed', err),
  })

  if (isLoggedIn && user) {
    return (
      <div className="flex items-center gap-2">
        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
        <button
          onClick={logout}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          התנתק
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => login()}
      className="bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-100"
    >
      <img
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        className="w-4 h-4"
        alt=""
      />
      התחבר עם Google
    </button>
  )
}
