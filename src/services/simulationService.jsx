import { PutCommand, QueryCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDB, ddbClient } from "../firebase/config";
import { CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";

export const ensureSimulationTableExists = async () => {
  try {
    await ddbClient.send(
      new DescribeTableCommand({ TableName: "Simulations" })
    );
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      await ddbClient.send(
        new CreateTableCommand({
          TableName: "Simulations",
          AttributeDefinitions: [
            { AttributeName: "PK", AttributeType: "S" },
            { AttributeName: "SK", AttributeType: "S" },
            { AttributeName: "GSI1PK", AttributeType: "S" },
            { AttributeName: "GSI1SK", AttributeType: "S" }
          ],
          KeySchema: [
            { AttributeName: "PK", KeyType: "HASH" },
            { AttributeName: "SK", KeyType: "RANGE" }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "SubjectIndex",
              KeySchema: [
                { AttributeName: "GSI1PK", KeyType: "HASH" },
                { AttributeName: "GSI1SK", KeyType: "RANGE" }
              ],
              Projection: { ProjectionType: "ALL" }
            }
          ],
          BillingMode: "PAY_PER_REQUEST"
        })
      );
    }
  }
};

export const simulationService = {
  addSimulationLink: async (subject, topic, simData) => {
    await ensureSimulationTableExists();

    const existingSimulations = await simulationService.getSimulationLinks(subject, topic);
    
    // Check if URL already exists
    if (existingSimulations.some(sim => sim.url === simData.url)) {
      return { success: false, message: 'Simulation URL already exists' };
    }

    const params = {
      TableName: "Simulations",
      Key: {
        PK: "SIMULATION#ALL",
        SK: `TOPIC#${subject}/${topic}`
      },
      UpdateExpression: `SET simulations = list_append(
        if_not_exists(simulations, :empty_list), 
        :new_sim
      ), GSI1PK = :gsi1pk, GSI1SK = :gsi1sk`,
      ExpressionAttributeValues: {
        ":empty_list": [],
        ":new_sim": [{
          name: simData.name,
          url: simData.url,
          createdAt: new Date().toISOString()
        }],
        ":gsi1pk": `SUBJECT#${subject}`,
        ":gsi1sk": `TOPIC#${topic}`
      },
      ReturnValues: "ALL_NEW"
    };

    try {
      await dynamoDB.send(new UpdateCommand(params));
      return true;
    } catch (error) {
      console.error('Error adding simulation:', error);
      throw error;
    }
  },

  getSimulationLinks: async (subject, topic) => {
    await ensureSimulationTableExists();

    const params = {
      TableName: "Simulations",
      Key: {
        PK: "SIMULATION#ALL",
        SK: `TOPIC#${subject}/${topic}`
      }
    };

    try {
      const response = await dynamoDB.send(new GetCommand(params));
      return response.Item?.simulations || [];
    } catch (error) {
      console.error('Error getting simulations:', error);
      throw error;
    }
  },

  getSimulationLinksBySubject: async (subject) => {
    await ensureSimulationTableExists();

    const params = {
      TableName: "Simulations",
      IndexName: "SubjectIndex",
      KeyConditionExpression: "GSI1PK = :subject",
      ExpressionAttributeValues: {
        ":subject": `SUBJECT#${subject}`
      }
    };

    try {
      const response = await dynamoDB.send(new QueryCommand(params));
      return response.Items || [];
    } catch (error) {
      console.error('Error getting simulations by subject:', error);
      throw error;
    }
  }
};