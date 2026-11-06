# DeepBrain Game Guide

Welcome to the repository for our Education Games collection. This platform serves as the unified portal to access, play, and track their progress across various educational games developed by our team.

## Overview

This project is an integrated web portal that hosts a collection of educational games. It provides a secure entry point for users, handles authentication, and maintains a consistent user experience across different game modules.

Currently, our most established titles include:

- QuantumGo: A strategic game blending traditional Go mechanics with quantum pair pieces.

- FogChess: A unique twist on Chess that incorporates "fog of war" elements to teach tactical uncertainty and risk management.

## Technical Architecture & Deployment

The platform is built using a modern decoupled architecture to ensure scalability and ease of integration for new student developers.
Frontend Deployed on Cloudflare
Backend	Deployed on Railway
🔗 Useful Links

- Live Local Portal: Depend on your local dev

- Backend: [Link to Railway](https://railway.com/)
        
- Frontend: [Link to Cloudflare](https://dash.cloudflare.com/35ec55da1b68aff79643951f3277bf15/home/domains)

- Website: [Here](http://game.deepbraintechnology.com)


## Authentication & Data Persistence

To maintain educational progress, user authentication is required to access the hub.

Every game integrated into this hub must support data persistence. Users authenticate with the portal; games verify portal-issued credentials and associate game data with the verified portal user ID. Games do not require a separate player password. Game Developers are responsible to store:

- User Profiles: Maintaining a unique mapping to the portal user ID, with scores and levels stored in the game's own database.

- Match Data: Storing match history and game states (especially for multiplayer titles like FogChess).

- Caching: Utilizing Redis or similar caching mechanisms for real-time game performance where necessary to speed up performance.


## Development Guidelines

For new game integration, see the [DBT integration guide](docs/dbt-game-integration.md) and [skill installation guide](docs/dbt-game-integration-install.md). The repository-local integration skill is invoked explicitly as `$dbt-game-integration`; routine development does not require loading it.

We welcome contributions from students across different backgrounds. To keep the integration process seamless:

- Language Agnostic: You are free to choose the language for your specific game.

- Recommended Stack: TypeScript (Next.js/React), JavaScript (Node.js), Java

- API Standards: Ensure your game communicates with the main hub via the standardized REST/WebSocket protocols.

## Getting Started
1. Make a new repo, and create your game there.
2. Clone this repo.
3. In this repo, open a new branch from **main** name **"YOUR GAME"**, then make a game entrance and update your branch.
4. Open up a Pull Request from **"YOUR GAME"** to main. Admin will approve code changes.

## Q&A and READ
1. Contact @Jingmao(Wechat/Email/Github) for any website log-in/registration/authentication to work in them.
2. Make your code tide and clean. Make your code in modules and files. Make your code readable and workable.
3. Ask for anything.
4. Take this as exmaple: [QuantumGo](https://github.com/DeepBrainTech/QuantumGo) for any game similar code.
5. Keep update your code in Github. Do not accumulate your local changes too much. Either You will miss the new changes on Github Or We will have conflict with your other changes.
