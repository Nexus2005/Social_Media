"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Cart } from "../types";
import { cartlyAdapter } from "../adapters/cartlyAdapter";
import { useToast } from "@/components/ui/use-toast";

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  isError: boolean;
  addToCart: (variantId: string, quantity: number) => Promise<void>;
  updateItemQty: (lineItemId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  updateSelection: (itemId: string, selected: boolean) => Promise<void>;
  batchUpdateSelection: (itemIds: string[], selected: boolean) => Promise<void>;
  batchRemoveItems: (itemIds: string[]) => Promise<void>;
  batchMoveToWishlist: (itemIds: string[]) => Promise<void>;
  checkout: () => Promise<any>;
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

    const newCart = await cartlyAdapter.createCart();
    localStorage.setItem("cartly_cart_id", newCart.id);
    return newCart.id;
  };

  const refreshCart = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const localId = localStorage.getItem("cartly_cart_id");
      if (localId) {
        try {
          const data = await cartlyAdapter.getCart(localId);
          setCart(data);
        } catch (innerError) {
          console.warn("Cart ID in localStorage was invalid/not found, clearing it:", innerError);
          localStorage.removeItem("cartly_cart_id");
          setCart(null);
        }
      } else {
        setCart(null);
      }
    } catch (e) {
      console.warn("Error loading cart details from commerce adapter:", e);
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
      const updatedCart = await cartlyAdapter.addToCart(cartId, variantId, quantity);
      setCart(updatedCart);
      toast({ description: "Added product to cart!" });
    } catch (e: any) {
      console.error("addToCart error:", e);
      toast({
        variant: "destructive",
        description: e.message || "Failed to add product to cart."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateItemQty = async (lineItemId: string, quantity: number) => {
    const localId = localStorage.getItem("cartly_cart_id");
    if (!localId || !cart) return;

    // Optimistic UI Update
    const oldCart = { ...cart };
    const optimisticItems = cart.items.map(item => 
      item.id === lineItemId ? { ...item, quantity } : item
    );
    setCart({ ...cart, items: optimisticItems });

    try {
      const updatedCart = await cartlyAdapter.updateLineItem(localId, lineItemId, quantity);
      setCart(updatedCart);
    } catch (e: any) {
      console.error("updateItemQty error:", e);
      // Rollback on failure
      setCart(oldCart);
      toast({
        variant: "destructive",
        description: e.message || "Failed to update quantity."
      });
    }
  };

  const removeItem = async (lineItemId: string) => {
    const localId = localStorage.getItem("cartly_cart_id");
    if (!localId || !cart) return;

    const oldCart = { ...cart };
    const optimisticItems = cart.items.filter(item => item.id !== lineItemId);
    setCart({ ...cart, items: optimisticItems });

    try {
      const updatedCart = await cartlyAdapter.removeLineItem(localId, lineItemId);
      setCart(updatedCart);
      toast({ description: "Product removed from cart." });
    } catch (e: any) {
      console.error("removeItem error:", e);
      setCart(oldCart);
      toast({
        variant: "destructive",
        description: e.message || "Failed to remove item from cart."
      });
    }
  };

  const applyCoupon = async (code: string) => {
    const localId = localStorage.getItem("cartly_cart_id");
    if (!localId) return;
    setIsLoading(true);
    try {
      const updatedCart = await cartlyAdapter.applyCoupon(localId, code);
      setCart(updatedCart);
      toast({ description: "Coupon applied successfully!" });
    } catch (e: any) {
      console.error("applyCoupon error:", e);
      toast({
        variant: "destructive",
        description: e.message || "Failed to apply coupon."
      });
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const removeCoupon = async () => {
    const localId = localStorage.getItem("cartly_cart_id");
    if (!localId) return;
    setIsLoading(true);
    try {
      const updatedCart = await cartlyAdapter.removeCoupon(localId);
      setCart(updatedCart);
      toast({ description: "Coupon removed." });
    } catch (e: any) {
      console.error("removeCoupon error:", e);
      toast({
        variant: "destructive",
        description: e.message || "Failed to remove coupon."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSelection = async (itemId: string, selected: boolean) => {
    const localId = localStorage.getItem("cartly_cart_id");
    if (!localId) return;

    try {
      const updatedCart = await cartlyAdapter.updateSelection(localId, itemId, selected);
      setCart(updatedCart);
    } catch (e: any) {
      console.error("updateSelection error:", e);
      toast({
        variant: "destructive",
        description: e.message || "Failed to update item selection."
      });
    }
  };

  const batchUpdateSelection = async (itemIds: string[], selected: boolean) => {
    const localId = localStorage.getItem("cartly_cart_id");
    if (!localId) return;

    try {
      const updatedCart = await cartlyAdapter.batchUpdateSelection(localId, itemIds, selected);
      setCart(updatedCart);
    } catch (e: any) {
      console.error("batchUpdateSelection error:", e);
      toast({
        variant: "destructive",
        description: e.message || "Failed to update bulk selection."
      });
    }
  };

  const batchRemoveItems = async (itemIds: string[]) => {
    const localId = localStorage.getItem("cartly_cart_id");
    if (!localId || !cart) return;

    const oldCart = { ...cart };
    const optimisticItems = cart.items.filter(item => !itemIds.includes(item.id));
    setCart({ ...cart, items: optimisticItems });

    try {
      const updatedCart = await cartlyAdapter.removeLineItemsBatch(localId, itemIds);
      setCart(updatedCart);
      toast({ description: "Selected products removed." });
    } catch (e: any) {
      console.error("batchRemoveItems error:", e);
      setCart(oldCart);
      toast({
        variant: "destructive",
        description: e.message || "Failed to remove selected items."
      });
    }
  };

  const batchMoveToWishlist = async (itemIds: string[]) => {
    const localId = localStorage.getItem("cartly_cart_id");
    if (!localId || !cart) return;

    const oldCart = { ...cart };
    const optimisticItems = cart.items.filter(item => !itemIds.includes(item.id));
    setCart({ ...cart, items: optimisticItems });

    try {
      const updatedCart = await cartlyAdapter.batchMoveToWishlist(localId, itemIds);
      setCart(updatedCart);
      toast({ description: "Selected products moved to wishlist." });
    } catch (e: any) {
      console.error("batchMoveToWishlist error:", e);
      setCart(oldCart);
      toast({
        variant: "destructive",
        description: e.message || "Failed to move items to wishlist."
      });
    }
  };

  const checkout = async () => {
    const localId = localStorage.getItem("cartly_cart_id");
    if (!localId) return;

    try {
      const data = await cartlyAdapter.checkout(localId);
      return data;
    } catch (e: any) {
      console.error("checkout error:", e);
      toast({
        variant: "destructive",
        description: e.message || "Failed to proceed to checkout."
      });
      throw e;
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
        applyCoupon,
        removeCoupon,
        updateSelection,
        batchUpdateSelection,
        batchRemoveItems,
        batchMoveToWishlist,
        checkout
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
