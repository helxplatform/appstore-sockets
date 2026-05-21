import axios from 'axios'
import { appstoreHost } from '../config'

export interface AppstoreAuthResult {
    remoteUser?: string
    accessToken?: string
}

// Calls the appstore /auth/ endpoint with the supplied cookie header and returns
// the identity it reports. A missing remoteUser means the session is not valid
// (expired, logged out, or never authenticated).
export const checkAppstoreAuth = async (cookie: string | undefined): Promise<AppstoreAuthResult> => {
    try {
        const authRes = await axios.get(`http://${ appstoreHost }/auth/`, {
            headers: { Cookie: cookie },
            maxRedirects: 0
        })
        return {
            remoteUser: authRes.headers["remote_user"],
            accessToken: authRes.headers["access_token"]
        }
    } catch {
        return {}
    }
}
