import { PolicyStatement, Effect } from '@aws-cdk/aws-iam';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { Construct, Duration } from '@aws-cdk/core';
import { AwsCustomResource, AwsSdkCall, PhysicalResourceId, AwsCustomResourcePolicy } from '@aws-cdk/custom-resources';

export interface CdkCallCustomResourceConstructProps {
  tableName: string;
  tableArn: string;
  items: any[];
}

interface RequestItem {
  [key: string]: any[];
}

interface DynamoInsert {
  RequestItems: RequestItem;
}

export class BatchInsertCustomResourceConstruct extends Construct {

  constructor(scope: Construct, id: string, props: CdkCallCustomResourceConstructProps) {
    super(scope, id);
    this.insertMultipleRecord(props.tableName, props.tableArn, props.items);
  }

  private insertMultipleRecord(tableName: string, tableArn: string, items: any[]) {
    const records = this.constructBatchInsertObject(items, tableName);

    const awsSdkCall: AwsSdkCall = {
      service: 'DynamoDB',
      action: 'batchWriteItem',
      physicalResourceId: PhysicalResourceId.of(tableName + 'insert'),
      parameters: records,
    };

    new AwsCustomResource(this, `${this.node.id}_custom_resource`, {
      onCreate: awsSdkCall,
      onUpdate: awsSdkCall,
      logRetention: RetentionDays.ONE_WEEK,
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          sid: 'DynamoWriteAccess',
          effect: Effect.ALLOW,
          actions: ['dynamodb:BatchWriteItem'],
          resources: [tableArn],
        }),
      ]),
      timeout: Duration.minutes(5),
    },
    );
  }

  private constructBatchInsertObject(items: any[], tableName: string) {
    const itemsAsDynamoPutRequest: any[] = [];
    items.forEach(item => itemsAsDynamoPutRequest.push({
      PutRequest: {
        Item: item,
      },
    }));
    const records: DynamoInsert =
    {
      RequestItems: {},
    };
    records.RequestItems[tableName] = itemsAsDynamoPutRequest;
    return records;
  }
}