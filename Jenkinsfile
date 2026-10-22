@Library('deployment-library@main') _

// portofolio-event-music-be (ns portofolio)
// Plain pipeline: image build + helm chart generic-app with values/values.production.yml.
// Exposed through ingress nginx-endlessapp at /server-api/portofolio-event-music-be/.
deployPipeline(
    gitRepository: 'https://github.com/enrichoalkalas01/portofolio-event-music-be.git',
    gitBranch: 'master',
    gitCredentialsId: 'github-credentials',

    registryUrl: '192.168.20.21',
    registryCredentialsId: 'harbor-credentials',
    imageName: 'portofolio-event-music-be',
    imageFolder: 'other',

    namespace: 'portofolio',
    helmValuesFile: 'values/values.production.yml',
    servicePort: '30801',
)
