import { createYoga, createSchema } from "graphql-yoga";
import { join } from "path";
import { readFileSync } from "fs";
import { Resolvers } from '../../../types';
import type { PrismaClient } from "@prisma/client";
import currencyFormatter from "currency-formatter";

import prisma from "../../lib/prisma";
import { findOrCreateCart } from "@/lib/cart";
import { stripe } from "../../lib/stripe";
import { origin } from "../../lib/client";

const currencyCode = "USD";

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

const resolvers: Resolvers = {
  Query: {
    cart: async (_, { id }, { prisma }) => {
      return await findOrCreateCart(prisma, id);
    },
  },

  Mutation: {
    addItem: async (_, { input }, { prisma }) => {
      const cart = await findOrCreateCart(prisma, input.cartId);
      await prisma.cartItem.upsert({
        create: {
          cartId: cart.id,
          id: input.id,
          name: input.name,
          description: input.description,
          image: input.image,
          price: input.price,
          quantity: input.quantity || 1,
        },
        where: { id_cartId: { id: input.id, cartId: cart.id } },
        update: {
          quantity: {
            increment: input.quantity || 1,
          },
        },
      });
      return cart;
    },
    removeItem: async (_, { input }, { prisma }) => {
      const { cartId } = await prisma.cartItem.delete({
        where: { id_cartId: { id: input.id, cartId: input.cartId } },
        select: {
          cartId: true,
        },
      });
      return await findOrCreateCart(prisma, cartId);
    },
    increaseCartItem: async (_, { input }, { prisma }) => {
      const { cartId } = await prisma.cartItem.update({
        data: {
          quantity: {
            increment: 1,
          },
        },
        where: { id_cartId: { id: input.id, cartId: input.cartId } },
        select: {
          cartId: true,
        },
      });
      return findOrCreateCart(prisma, cartId);
    },

    decreaseCartItem: async (_, { input }, { prisma }) => {
      const { cartId, quantity } = await prisma.cartItem.update({
        data: {
          quantity: {
            decrement: 1,
          },
        },
        where: { id_cartId: { id: input.id, cartId: input.cartId } },
        select: {
          cartId: true,
          quantity: true
        },
      });
      // if quantity is 0 delete the item
      if (quantity <= 0) {
        await prisma.cartItem.delete({
          where: {
            id_cartId: {
              id: input.id,
              cartId: input.cartId,
            },
          },
        });
      }
      return findOrCreateCart(prisma, cartId);
    },
    createCheckoutSession: async (_, { input }, { prisma }) => {
      const { cartId } = input;

      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
      });

      if (!cart) {
        throw new Error("Invalid cart");
      }

      const cartItems = await prisma.cart
        .findUnique({
          where: { id: cartId },
        })
        .items();

      if (!cartItems || cartItems.length === 0) {
        throw new Error("Cart is empty");
      }

      const line_items = cartItems.map((item) => {
        return {
          quantity: item.quantity,
          price_data: {
            currency: currencyCode,
            unit_amount: item.price,
            product_data: {
              name: item.name,
              description: item.description || undefined,
              images: item.image ? [item.image] : [],
            },
          },
        };
      });

      const session = await stripe.checkout.sessions.create({
        success_url: `${origin}/thankyou?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cart?cancelled=true`,
        line_items,
        metadata: {
          cartId: cart.id,
        },
        mode: "payment",
      });

      return {
        id: session.id,
        url: session.url,
      };
    },
  },
  // we implement some of the types here because we don't store every field in prisma thus it does not return the whole defined type in our graphql schema queries
  Cart: {
    items: async ({ id }, _, { prisma }) => {
      const result = await prisma.cart
        .findUnique({
          where: { id },
        }).items()

      return result!;
    },
    totalItems: async ({ id }, _, { prisma }) => {
      const items = await prisma.cart
        .findUnique({
          where: { id },
        })
        .items();
      const total = items?.reduce((total, item) => total + item.quantity || 1, 0); // the accumulator starts from 0
      return total!
    },
    subTotal: async ({ id }, _, { prisma }) => {
      const items = await prisma.cart
        .findUnique({
          where: { id },
        })
        .items();

      const amount =
        items?.reduce((acc, item) => acc + item.price * item.quantity, 0) ?? 0;

      return {
        amount,
        formatted: currencyFormatter.format(amount / 100, {
          code: currencyCode,
        }),
      };
    },
  },

  CartItem: {
    unitTotal: (item) => {
      const amount = item.price;
      return {
        amount,
        formatted: currencyFormatter.format(amount / 100, {
          code: currencyCode,
        }),
      };
    },
    lineTotal: (item) => {
      const amount = item.quantity * item.price;

      return {
        amount,
        formatted: currencyFormatter.format(amount / 100, {
          code: currencyCode,
        }),
      };
    },
  },

};

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