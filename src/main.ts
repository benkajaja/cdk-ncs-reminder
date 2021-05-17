// import * as fs from 'fs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { App, Construct, Stack, StackProps, RemovalPolicy, CfnOutput, Duration } from '@aws-cdk/core';
import { BatchInsertCustomResourceConstruct } from './custom';


export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    const ncsTable = new dynamodb.Table(this, 'Table', {
      tableName: 'ncs_reminder_table',
      timeToLiveAttribute: 'TTL',
      partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });
    const items = makeItems(2021, 5, 12); // config reminder start date (year, month, duration(#month))
    const custom = new BatchInsertCustomResourceConstruct(this, 'initData', {
      tableArn: ncsTable.tableArn,
      tableName: ncsTable.tableName,
      items: items,
    });

    const lambdafn = new lambda.Function(this, 'lambda', {
      logRetention: RetentionDays.SIX_MONTHS,
      functionName: 'ncs_reminder',
      runtime: lambda.Runtime.NODEJS_10_X,
      timeout: Duration.seconds(60),
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda.zip'),
      environment: {
        ENVMOD: 'DEV', //DEV or PROD
        SECRETNAME: 'secretsForTG', // name of secret which is stored in secret managers
      },
    });

    lambdafn.addEventSourceMapping('evsm', {
      eventSourceArn: ncsTable.tableStreamArn,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    });

    lambdafn.role!.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite'));
    lambdafn.role!.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambdaInvocation-DynamoDB'));

    custom.node.addDependency(ncsTable);

    new CfnOutput(this, 'TableArn', {
      value: ncsTable.tableArn,
    });
    new CfnOutput(this, 'TableName', {
      value: ncsTable.tableName,
    });
    new CfnOutput(this, 'LambdaName', {
      value: lambdafn.functionName,
    });
  }
}

function makeItems(startYear: number, startMonth: number, duration: number) {
  let items = [];
  for (let i = 0; i < duration; i++) {
    // let tmp = new Date(Date.UTC(startYear, startMonth + i - 1, 20, 4, 0)); //UTC 04:00 = GMT+8 12:00
    // let tmp = new Date(Date.UTC(startYear, startMonth + i - 1, 19, 15, 0)); //UTC 15:00 = GMT+8 23:00
    let tmp = new Date(Date.UTC(startYear, startMonth + i - 1, 19, 10, 0)); //UTC 10:00 = GMT+8 18:00
    items.push({
      date: { S: `${tmp.getFullYear()}/${tmp.getMonth() + 1}` },
      exp: { S: tmp.toString() },
      TTL: { N: Math.floor(tmp.getTime() / 1000).toString() },
    });
  }
  return items;
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'ncs-stack', { env: devEnv });
// new MyStack(app, 'my-stack-prod', { env: prodEnv });

app.synth();