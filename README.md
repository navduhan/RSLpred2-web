# RSLpred2 web application

RSLpred2 is a Next.js web interface for predicting *Oryza sativa* protein subcellular localization. It supports FASTA input, accession-based sequence retrieval, selectable prediction levels, protected asynchronous jobs, and results export.

Prediction computation is not included in this repository. In production, the application sends validated inputs over pinned-key SSH/SFTP to a configured SLURM cluster and runs the configured batch script with `sbatch --wait`. It never fabricates prediction results.

## Runtime and packages

Use Node.js 22 and npm to match the included Docker image. Install dependencies with `npm ci` so that npm uses the versions recorded in `package-lock.json`.

The lockfile currently includes:

| Package | Locked version |
| --- | --- |
| Next.js | 16.3.3 |
| React | 19.2.4 |
| TypeScript | 5.9.3 |
| Tailwind CSS | 4.3.3 |
| ssh2 | 1.17.0 |

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Create the production build |
| `npm start` | Serve the production build |

## Local interface development

```bash
npm ci
npm run dev
```

The interface is available at `http://localhost:3000`. Cluster-backed prediction endpoints require the environment described in `deploy/README.md`.

## Production build

```bash
npm ci
npm run build
npm start
```

The included Dockerfile creates a non-root Next.js standalone image. Prediction inputs, downloadable archives, SSH keys, and environment files are intentionally excluded from version control and the Docker build context.

## Downloadable prediction package

The downloadable prediction package is separate from this web interface. To enable the package-download link, place `RSLpred-2.0.tar.gz` in `public/download/` on the deployment host. The archive is mounted at runtime and is excluded from Git and the Docker image.

See the [deployment guide](deploy/README.md) for archive transfer, cluster configuration, and Docker or Podman setup.

## Publication

Duhan, N., & Kaundal, R. (2025). RSLpred2: An Integrated Web Server for the Annotation of Rice Proteome Subcellular Localization Using Deep Learning. *Rice, 18*, 58. https://doi.org/10.1186/s12284-025-00767-7

## License

No open-source license has been assigned yet. The source is publicly visible, but reuse rights remain reserved unless a license is added.
