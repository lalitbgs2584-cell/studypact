import dotenv from "dotenv";
dotenv.config();

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../db";
import { sendResetPasswordEmail } from "./email";

const trustedOrigins = [
    process.env.BETTER_AUTH_BASE_URL || "http://localhost:3000",
    process.env.ADMIN_APP_URL || "http://localhost:3001",
].filter(Boolean);

const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_BASE_URL,
    trustedOrigins,
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    user: {
        additionalFields: {
            role: {
                type: "string",
                default: "member",
            },
            isBlocked: {
                type: "boolean",
                default: false,
            },
        },
    },
    emailAndPassword: {
        enabled: true,
        resetPasswordTokenExpiresIn: 60 * 60,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({ user, url }) => {
            await sendResetPasswordEmail({
                email: user.email,
                name: user.name,
                url,
            });
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    }
});

export default auth;
