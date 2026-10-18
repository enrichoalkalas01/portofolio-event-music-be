@Library('deployment-library@main') _

// portofolio-event-music-be — DEV (ns portofolio)
// Runtime env from Vault `portofolio/portofolio-event-music-be` via ESO. NodePort dev 31182.
deployPipelineVaultEso(
    gitRepository: 'https://github.com/enrichoalkalas01/portofolio-event-music-be.git',
    gitBranch: 'master',
    gitCredentialsId: 'github-credentials',

    registryUrl: '192.168.20.21',
    registryCredentialsId: 'harbor-credentials',
    imageName: 'portofolio-event-music-be',
    imageFolder: 'other',

    namespace: 'portofolio',
    helmValuesFile: 'values/values.dev.yml',
    servicePort: '31182',

    vaultRuntimePath: 'portofolio-event-music-be',
    vaultRuntimeStoreName: 'vault-backend',
    vaultRuntimeRefreshInterval: '1m',
)
