const { AwsCdkTypeScriptApp, DependenciesUpgradeMechanism, UpgradeDependenciesSchedule } = require('projen');

const project = new AwsCdkTypeScriptApp({
  cdkVersion: '1.106.0',
  defaultReleaseBranch: 'main',
  jsiiFqn: 'projen.AwsCdkTypeScriptApp',
  name: 'cdk-ncs-reminder',
  cdkDependencies: [
    '@aws-cdk/aws-dynamodb',
    '@aws-cdk/aws-iam',
    '@aws-cdk/aws-logs',
    '@aws-cdk/custom-resources',
    '@aws-cdk/aws-lambda',
    '@aws-cdk/aws-lambda-event-sources',
  ],
  depsUpgrade: DependenciesUpgradeMechanism.githubWorkflow({
    workflowOptions: {
      schedule: UpgradeDependenciesSchedule.MONTHLY,
    },
  }),
});

project.synth();
