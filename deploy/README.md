# RSLpred2 VM deployment

This deployment runs the Next.js application behind an unprivileged Nginx gateway on VM port 3215. Prediction inputs are transferred over pinned-key SSH/SFTP to the configured cluster, submitted with `sbatch --parsable --wait`, and the real result files are retrieved over SFTP.

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

### Rootless Podman (recommended on RHEL-family VMs)

Install the external Compose provider, then run the deployment as the unprivileged VM user without `sudo`:

```bash
sudo dnf install -y podman-compose
podman info --format '{{.Host.Security.Rootless}}'
podman compose --env-file deploy/docker.env \
  -f deploy/compose.yaml \
  -f deploy/compose.podman.yaml \
  up -d --build
```

The rootless check must print `true`. The Podman overlay uses `keep-id` for the application process and private SELinux relabeling for its bind mounts. It also mounts the dedicated cluster key read-only; do not add `compose.ssh-key.yaml` to the Podman command.

### Docker Engine

```bash
docker compose --env-file deploy/docker.env -f deploy/compose.yaml -f deploy/compose.ssh-key.yaml up -d --build
```

The gateway listens only on `127.0.0.1:3215` by default. When the HTTPS reverse proxy is on another host, set `PUBLIC_BIND_ADDRESS` to the VM's private interface and `TRUSTED_PROXY_CIDR` to the reverse proxy's exact source address with a `/32` prefix. Restrict TCP port 3215 at the VM firewall to that same source address. Never expose the internal application container.

For a subpath deployment, set `NEXT_PUBLIC_BASE_PATH=/RSLpred2` before building and proxy the path without stripping it:

```apache
ProxyPreserveHost On
ProxyAddHeaders On
RequestHeader set X-Forwarded-Proto "https"
ProxyPass        "/RSLpred2" "http://VM_PRIVATE_IP:3215/RSLpred2"
ProxyPassReverse "/RSLpred2" "http://VM_PRIVATE_IP:3215/RSLpred2"
```

Check the deployment:

```bash
podman compose --env-file deploy/docker.env -f deploy/compose.yaml -f deploy/compose.podman.yaml ps
podman compose --env-file deploy/docker.env -f deploy/compose.yaml -f deploy/compose.podman.yaml logs -f app gateway
curl --fail http://127.0.0.1:3215/RSLpred2
```

Place `RSLpred-2.0.tar.gz` in `public/download/` only if the public package-download link should be enabled. The archive is mounted at runtime and is never stored in Git or baked into the image.

## Optional local fallback

Cluster execution is always attempted first. Local inference remains disabled unless `deploy/compose.local-fallback.yaml` is added explicitly and `LOCAL_PREDICTOR_DIR` points to a read-only predictor installation containing `.venv/bin/python`, `RSLpred2.py`, packages, and models.

Do not use the fallback overlay on a resource-constrained VM until its CPU and memory limits have been reviewed.
