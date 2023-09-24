import type { AppProps } from "next/app";
import { ApolloProvider } from "@apollo/client";
import { useClient } from "../lib/client";
import "../styles/globals.css"

export default function App({ Component, pageProps }: AppProps) {
  const client = useClient();
  return (
    <ApolloProvider client={client}>
      <Component {...pageProps} />
    </ApolloProvider>
  );
}
