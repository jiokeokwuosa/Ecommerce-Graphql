
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: "schema.graphql",
  documents:"**/*.graphql",
  generates: {
    "types.ts": {
      plugins: ["typescript", "typescript-resolvers", "typescript-react-apollo"],
      config:{
        contextType: "./src/pages/api/graphql#GraphQLContext",
        mapperTypeSuffix: "Model",
        mappers: {
          Cart: "@prisma/client#Cart",
          CartItem: "@prisma/client#CartItem"
        }
      }
     
    }
  }
};

export default config;
