"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";
import { getUserDataSelect } from "@/lib/types";
import { toPlainObject } from "@/lib/utils";
import {
  updateUserProfileSchema,
  UpdateUserProfileValues,
} from "@/lib/validation";

export async function updateUserProfile(values: UpdateUserProfileValues) {
  const validatedValues = updateUserProfileSchema.parse(values);

  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  // Check username uniqueness if changed
  if (validatedValues.username !== user.username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: validatedValues.username,
          mode: "insensitive",
        },
      },
    });
    if (existingUser) {
      throw new Error("Username is already taken.");
    }
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        displayName: validatedValues.displayName,
        username: validatedValues.username,
        bio: validatedValues.bio,
        location: validatedValues.location,
        websiteUrl: validatedValues.websiteUrl,
        birthDate: validatedValues.birthDate,
        professionalCategory: validatedValues.professionalCategory,
      },
      select: getUserDataSelect(user.id),
    });
    await streamServerClient.partialUpdateUser({
      id: user.id,
      set: {
        name: validatedValues.displayName,
        username: validatedValues.username,
      },
    });
    return updatedUser;
  });

  return toPlainObject(updatedUser);
}
