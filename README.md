# RSLpred2 web application

RSLpred2 is a Next.js web interface for predicting *Oryza sativa* protein subcellular localization. It supports FASTA input, accession-based sequence retrieval, selectable prediction levels, protected asynchronous jobs, and results export.

Prediction computation is not included in this repository. In production, the application sends validated inputs over pinned-key SSH/SFTP to a configured SLURM cluster and runs the configured batch script with `sbatch --wait`. It never fabricates prediction results.

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

## Publication

Duhan, N., & Kaundal, R. (2025). RSLpred2: An Integrated Web Server for the Annotation of Rice Proteome Subcellular Localization Using Deep Learning. *Rice, 18*, 58. https://doi.org/10.1186/s12284-025-00767-7

## License

No open-source license has been assigned yet. The source is publicly visible, but reuse rights remain reserved unless a license is added.
