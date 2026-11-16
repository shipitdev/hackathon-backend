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

For private data, enable row security on tables and file security on buckets. Grant creation to authenticated users as needed and use owner permissions for reads, updates, and deletes. Verify the setup with two ordinary users and check that each can access only their own rows and files.

## Verify the session flow

Use Node.js 22 or later and a disposable project with email/password auth enabled.
The check creates one test user per run and revokes its session. Delete the test
users from the Appwrite console when finished.

```sh
APPWRITE_ENDPOINT=https://appwrite.example.com/v1 \
APPWRITE_PROJECT_ID=your-test-project \
node bin/hackathon-auth-smoke.mjs
```
