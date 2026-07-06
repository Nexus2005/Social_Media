"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Cart, LineItem } from "../types";
import { CartService } from "../services/cart";
import { useToast } from "@/components/ui/use-toast";

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  isError: boolean;
  addToCart: (variantId: string, quantity: number) => Promise<void>;
  updateItemQty: (lineItemId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const { toast } = useToast();

  const getOrCreateCartId = async (): Promise<string> => {
    const localId = localStorage.getItem("cartly_cart_id");
    if (localId) return localId;

    const newCart = await CartService.createCart();
    localStorage.setItem("cartly_cart_id", newCart.id);
    return newCart.id;
  };

  const refreshCart = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const localId = localStorage.getItem("cartly_cart_id");
      if (localId) {
        const data = await CartService.retrieveCart(localId);
        setCart(data);
      } else {
        setCart(null);
      }
    } catch (e) {
      console.warn("Error loading cart details from Medusa backend:", e);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const addToCart = async (variantId: string, quantity: number) => {
    setIsLoading(true);
    try {
      const cartId = await getOrCreateCartId();
      const updatedCart = await CartService.addToCart(cartId, variantId, quantity);
      setCart(updatedCart);
      toast({
        description: "Added product to cart!",
      });
    } catch (e) {
      console.error("addToCart error:", e);
      toast({
        variant: "destructive",
        description: "Failed to add product to cart.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateItemQty = async (lineItemId: string, quantity: number) => {
    const localId = localStorage.getItem("cartly_cart_id");
    if (!localId) return;
    setIsLoading(true);
    try {
      const updatedCart = await CartService.updateLineItem(localId, lineItemId, quantity);
      setCart(updatedCart);
    } catch (e) {
      console.error("updateItemQty error:", e);
      toast({
        variant: "destructive",
        description: "Failed to update quantity.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (lineItemId: string) => {
    const localId = localStorage.getItem("cartly_cart_id");
    if (!localId) return;
    setIsLoading(true);
    try {
      const updatedCart = await CartService.removeLineItem(localId, lineItemId);
      setCart(updatedCart);
      toast({
        description: "Product removed from cart.",
      });
    } catch (e) {
      console.error("removeItem error:", e);
      toast({
        variant: "destructive",
        description: "Failed to remove item from cart.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        isError,
        addToCart,
        updateItemQty,
        removeItem,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
