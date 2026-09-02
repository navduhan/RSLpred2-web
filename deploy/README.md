# RSLpred2 VM deployment

This deployment runs the Next.js application behind an unprivileged Nginx gateway on VM loopback port 3215. Prediction inputs are transferred over pinned-key SSH/SFTP to the configured cluster, submitted with `sbatch --parsable --wait`, and the real result files are retrieved over SFTP.

## VM preparation

Install Docker Engine and its Compose plugin, then clone this repository. Create the runtime-only directories and environment file:

```bash
mkdir -p public/download deploy/data/jobs
cp deploy/docker.env.example deploy/docker.env
openssl rand -hex 32
```

Put the generated value in `JOB_OWNER_HMAC_SECRET`. Fill in the remaining placeholders in `deploy/docker.env`. The environment file and job data are ignored by Git.

Use a dedicated, restricted cluster SSH key. Verify the cluster ED25519 fingerprint with the cluster administrator through a separate trusted channel before setting `BIOCLUSTER_HOST_KEY_SHA256`:

```bash
ssh-keyscan -p 22 -t ed25519 biocluster.example.edu | ssh-keygen -lf - -E sha256
chmod 0600 /absolute/path/to/dedicated-private-key
```

`ssh-keyscan` discovers a key but does not establish trust by itself. Password authentication is not supported by this deployment.

The configured SLURM script must accept `input.fasta level model output-directory`, write final tab-delimited results under the supplied output directory, and return a nonzero exit code on failure.

## Start

```bash
docker compose --env-file deploy/docker.env -f deploy/compose.yaml -f deploy/compose.ssh-key.yaml up -d --build
```

The gateway listens only on `127.0.0.1:3215` by default. Configure the VM's public HTTPS reverse proxy to forward the RSLpred2 domain to that address. Do not expose the internal application container.

Check the deployment:

```bash
docker compose --env-file deploy/docker.env -f deploy/compose.yaml -f deploy/compose.ssh-key.yaml ps
docker compose --env-file deploy/docker.env -f deploy/compose.yaml -f deploy/compose.ssh-key.yaml logs -f app gateway
curl --fail http://127.0.0.1:3215/
```

Place `RSLpred-2.0.tar.gz` in `public/download/` only if the public package-download link should be enabled. The archive is mounted at runtime and is never stored in Git or baked into the image.

## Optional local fallback

Cluster execution is always attempted first. Local inference remains disabled unless `deploy/compose.local-fallback.yaml` is added explicitly and `LOCAL_PREDICTOR_DIR` points to a read-only predictor installation containing `.venv/bin/python`, `RSLpred2.py`, packages, and models.

Do not use the fallback overlay on a resource-constrained VM until its CPU and memory limits have been reviewed.
