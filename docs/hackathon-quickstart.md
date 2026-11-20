# Connect a hackathon app

Deploy Appwrite or use an existing Appwrite endpoint. Create a separate project for each app. In the project console, register your web hostname or native app identifier as a platform. Copy the API endpoint (including /v1) and project ID into the client. Keep API keys on the server.

## Web authentication

Install the Appwrite Web SDK version compatible with your deployment. Use the same Client instance across requests so the SDK can maintain the session.

```js
import { Account, Client, ID } from 'appwrite';

const client = new Client().setEndpoint(endpoint).setProject(projectId);
const account = new Account(client);

export const register = (email, password) =>
  account.create({ userId: ID.unique(), email, password });

export const signIn = (email, password) =>
  account.createEmailPasswordSession({ email, password });

export const currentUser = () => account.get();
export const signOut = () => account.deleteSession({ sessionId: 'current' });
```

Configure SMTP for email verification and recovery on self-hosted deployments. Register the callback hostname with the project before configuring either flow. Test signup, sign-in, recovery, and sign-out against a disposable project.

### Email verification and password recovery

Register the callback hostname as an Appwrite web platform. Configure the
callback URLs in your app rather than accepting arbitrary redirect destinations.
An authenticated user can request verification. Recovery starts with an email
address and can run before sign-in.

```js
export const sendVerification = () =>
  account.createEmailVerification({ url: verificationCallbackUrl });

export const verifyEmail = (userId, secret) =>
  account.updateEmailVerification({ userId, secret });

export const requestRecovery = (email) =>
  account.createRecovery({ email, url: recoveryCallbackUrl });

export const finishRecovery = (userId, secret, password) =>
  account.updateRecovery({ userId, secret, password });
```

Read `userId` and `secret` from the callback query string and keep them out
of application logs and analytics. Remove the query string once you have read
it. On the recovery form, use the same confirmation message whether or not
the address belongs to a user.

For private data, enable row security on tables and file security on buckets. Grant creation to authenticated users as needed and use owner permissions for reads, updates, and deletes. Verify the setup with two ordinary users and check that each can access only their own rows and files.

## Store private data and files

Create a table with a string column named `text` and enable row security.
Enable file security on your storage bucket. Grant signed-in users Create at
the table and bucket levels. Leave Read, Update, and Delete ungranted at those
levels so the record and file permissions control access.

```js
import { Permission, Role, Storage, TablesDB } from 'appwrite';

const tables = new TablesDB(client);
const storage = new Storage(client);

async function ownerPermissions() {
  const { $id } = await account.get();
  const owner = Role.user($id);
  return [Permission.read(owner), Permission.update(owner), Permission.delete(owner)];
}

export const saveNote = async (text) =>
  tables.createRow({
    databaseId, tableId, rowId: ID.unique(), data: { text },
    permissions: await ownerPermissions(),
  });

export const uploadPrivateFile = async (file) =>
  storage.createFile({
    bucketId, fileId: ID.unique(), file,
    permissions: await ownerPermissions(),
  });
```

With two test accounts, create a row and file under the first account.
Keep their IDs and try to read them after signing in as the second account.
The second account must be denied even when it knows both IDs.

## Verify the session flow

Use Node.js 22 or later and a disposable project with email/password auth enabled.
The check creates one test user per run and revokes its session. Delete the test
users from the Appwrite console when finished.

```sh
APPWRITE_ENDPOINT=https://appwrite.example.com/v1 \
APPWRITE_PROJECT_ID=your-test-project \
node bin/hackathon-auth-smoke.mjs
```

## Run the fork locally

From the repository root, use Compose v2 with support for `!override`.
Build the local Appwrite image before starting the services.

```sh
git submodule update --init
docker compose -f docker-compose.yml -f dev/compose.hackathon.yaml build
docker compose -f docker-compose.yml -f dev/compose.hackathon.yaml up -d
```

Open http://localhost:8080 to set up a disposable project and use
`http://localhost:8080/v1` as the smoke test endpoint. The override publishes
only the local HTTP entry point. This development stack is for local testing.

## Add OAuth and MFA

Enable your OAuth provider in the project console. Register the callback URL
shown there with the provider and keep its client secret in Appwrite. Pass
fixed app URLs for the success and failure redirects.

```js
import { OAuthProvider } from 'appwrite';

export const signInWithGitHub = () =>
  account.createOAuth2Session({
    provider: OAuthProvider.Github,
    success: oauthSuccessUrl,
    failure: oauthFailureUrl,
  });
```

Call `account.get()` on return to confirm the session. For accounts with MFA,
keep the user's session pending until Appwrite accepts a challenge. Offer
only factors returned by `account.listMFAFactors()` and pass the selected
factor to the challenge endpoint.

```js
export const beginMfa = (factor) => account.createMFAChallenge({ factor });

export const finishMfa = (challengeId, otp) =>
  account.updateMFAChallenge({ challengeId, otp });
```

Use the challenge response's `$id` as `challengeId`. Keep authenticator codes
and recovery codes out of logs.
