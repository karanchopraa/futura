# Deployment Guide

Follow these steps to deploy Futura to production safely. 

## 1. Deploying the Backend to Render
The Backend is built with Node.js/Express and uses a persistent SQLite database. Render provides native support for this through Docker and Disk mounts.

1. Go to [Render](https://render.com/).
2. Sign in with GitHub and click **New > Blueprint**.
3. Connect your Futura GitHub repository.
4. Render will automatically detect the `render.yaml` file in the root directory.
5. Provide the required Environment Variables when prompted:
   - `RPC_URL` (e.g., your Qubetics Testnet RPC url: `https://rpc-testnet.qubetics.work/`)
   - `FACTORY_ADDRESS` (The address from your testnet deployment)
   - `TOKEN_ADDRESS` (The address from your testnet deployment)
6. Click **Apply**. Render will build the Docker container and attach a persistent Disk for the SQLite database.

## 2. Deploying the Frontend to Netlify
The Frontend is a Next.js application, perfectly suited for Netlify's serverless edge networks.

1. Go to [Netlify](https://www.netlify.com/).
2. Sign in with GitHub and click **Add New Site > Import an existing project**.
3. Select your Futura GitHub repository.
4. In the build settings, make sure:
   - **Base directory:** `Frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** Leave this blank (Netlify's Next.js Runtime handles this automatically)
5. Click **Add environment variables** and provide the following:
   - `NEXT_PUBLIC_API_URL` (Set this to the **Render Backend URL** generated in step 1, e.g., `https://futura-backend.onrender.com/api`)
   - `NEXT_PUBLIC_TOKEN_ADDRESS` (From testnet)
   - `NEXT_PUBLIC_FACTORY_ADDRESS` (From testnet)
   - `NEXT_PUBLIC_ADMIN_WALLET` (Your wallet address)
6. Click **Deploy**. Netlify will use the `netlify.toml` config to build the Next.js site.

---

> [!TIP]
> **Why this split architecture?** Netlify handles static pages and edge routing exceptionally well, ensuring quick load times for the frontend. Render provides the persistent storage needed for the SQLite database and the long-running process needed for the blockchain indexer.
