import { 
    generateRegistrationOptions, 
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} from '@simplewebauthn/server';
import type { 
    RegistrationResponseJSON, 
    AuthenticationResponseJSON,
} from '@simplewebauthn/server';

// The relying party (RP) identifier. Usually the domain of the application.
// We fall back to localhost in dev, but strictly validate origin in prod.
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const RP_NAME = process.env.NEXT_PUBLIC_RP_NAME || 'SecureAuth Enterprise';
const EXPECTED_ORIGIN = process.env.NEXT_PUBLIC_EXPECTED_ORIGIN || `http://${RP_ID}:3000`;

/**
 * Creates the challenge for registering a new passkey
 */
export async function getRegistrationOptions(user: { id: string; email: string; name?: string }) {
    return generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: new Uint8Array(Buffer.from(user.id)),
        userName: user.email,
        userDisplayName: user.name || user.email,
        attestationType: 'none',
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
            authenticatorAttachment: 'platform',
        },
    });
}

/**
 * Verifies a passkey registration response
 */
export async function verifyRegistration(
    response: RegistrationResponseJSON, 
    expectedChallenge: string
) {
    return verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: EXPECTED_ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: true,
    });
}

/**
 * Creates the challenge for logging in with an existing passkey
 */
export async function getAuthenticationOptions(allowCredentials: { id: string }[] = []) {
    return generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials: allowCredentials.map(cred => ({
            id: cred.id,
            transports: ['internal', 'usb', 'nfc', 'ble'],
        })),
        userVerification: 'preferred',
    });
}

/**
 * Verifies a passkey authentication response
 */
export async function verifyAuthentication(
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    authenticator: any
) {
    return verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: EXPECTED_ORIGIN,
        expectedRPID: RP_ID,
        credential: {
           id: authenticator.credentialID,
           publicKey: authenticator.credentialPublicKey,
           counter: authenticator.counter,
           transports: authenticator.transports,
        },
        requireUserVerification: true,
    });
}
