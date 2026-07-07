"use client";

import React, { createContext, useContext, useState, useTransition } from "react";
import { Product } from "../types";
import { RecommendationAdapter } from "../adapters/recommendationAdapter";

interface AIContextProps {
  getAIRecommendations: (limit?: number) => Promise<Product[]>;
  getSimilarProducts: (productId: string) => Promise<Product[]>;
  getOutfitBundles: (productId: string) => Promise<Product[]>;
  isAIProcessing: boolean;
}

const AIContext = createContext<AIContextProps | undefined>(undefined);

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
};

import { CartlyAdapter } from "../adapters/cartlyAdapter";
import { CartlyRecommendationAdapter } from "../adapters/recommendationAdapterImpl";

const cartlyAdapter = new CartlyAdapter();
const recommendationAdapter = new CartlyRecommendationAdapter(cartlyAdapter);

interface AIProviderProps {
  children: React.ReactNode;
}

export function AIProvider({ children }: AIProviderProps) {
  const [isAIProcessing, startTransition] = useTransition();

  const getAIRecommendations = async (limit = 6): Promise<Product[]> => {
    try {
      return await recommendationAdapter.getRecommendations(undefined, limit);
    } catch (e) {
      console.error("AIProvider: failed to fetch recommendations:", e);
      return [];
    }
  };

  const getSimilarProducts = async (productId: string): Promise<Product[]> => {
    try {
      // Mock AI similar products endpoint or map to DB / similar route API
      const response = await fetch(`/api/products/similar?productId=${productId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.products || [];
    } catch (e) {
      console.warn("AIProvider: failed to fetch similar products:", e);
      return [];
    }
  };

  const getOutfitBundles = async (productId: string): Promise<Product[]> => {
    try {
      // Mock Outfit Builder mapping
      return [];
    } catch (e) {
      console.warn("AIProvider: failed to compile outfit bundle:", e);
      return [];
    }
  };

  return (
    <AIContext.Provider
      value={{
        getAIRecommendations,
        getSimilarProducts,
        getOutfitBundles,
        isAIProcessing,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}
