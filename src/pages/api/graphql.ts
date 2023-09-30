import { createYoga, createSchema } from "graphql-yoga";
import { join } from "path";
import { readFileSync } from "fs";
import type { PrismaClient } from "@prisma/client";
import prisma from "../../lib/prisma";
import { resolvers } from "../../../resolvers.graphql";


export const config = {
  api: {
    bodyParser: false,
  },
};

export type GraphQLContext = {
  prisma: PrismaClient;
};

const typeDefs = readFileSync(join(process.cwd(), "schema.graphql"), {
  encoding: "utf-8",
});

const schema = createSchema({
  typeDefs,
  resolvers
})

export async function createContext(): Promise<GraphQLContext> {
  return {
    prisma,
  };
}

export default createYoga({
  graphqlEndpoint: '/api/graphql',
  schema,
  context: createContext()
});