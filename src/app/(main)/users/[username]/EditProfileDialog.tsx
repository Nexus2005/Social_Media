"use client";

import avatarPlaceholder from "@/assets/avatar-placeholder.png";
import CropImageDialog from "@/components/CropImageDialog";
import LoadingButton from "@/components/LoadingButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserData } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  updateUserProfileSchema,
  UpdateUserProfileValues,
} from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Resizer from "react-image-file-resizer";
import { useUpdateProfileMutation } from "./mutations";

interface EditProfileDialogProps {
  user: UserData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProfileDialog({
  user,
  open,
  onOpenChange,
}: EditProfileDialogProps) {
  const form = useForm<UpdateUserProfileValues>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      displayName: user.displayName,
      username: user.username,
      bio: user.bio || "",
      location: user.location || "",
      websiteUrl: user.websiteUrl || "",
      birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split("T")[0] as any : "",
      professionalCategory: user.professionalCategory || "",
    },
  });

  const mutation = useUpdateProfileMutation();

  const [croppedAvatar, setCroppedAvatar] = useState<Blob | null>(null);
  const [croppedBanner, setCroppedBanner] = useState<Blob | null>(null);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  async function onSubmit(values: UpdateUserProfileValues) {
    const newAvatarFile = croppedAvatar
      ? new File([croppedAvatar], `avatar_${user.id}.webp`)
      : undefined;

    const newBannerFile = croppedBanner
      ? new File([croppedBanner], `banner_${user.id}.webp`)
      : undefined;

    mutation.mutate(
      {
        values,
        avatar: newAvatarFile,
        banner: newBannerFile,
      },
      {
        onSuccess: () => {
          setCroppedAvatar(null);
          setCroppedBanner(null);
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2 border-b border-border/40 pb-4">
            {/* Header Banner upload */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Header Banner</Label>
              <BannerInput
                src={
                  croppedBanner
                    ? URL.createObjectURL(croppedBanner)
                    : user.headerBannerUrl || ""
                }
                onImageCropped={setCroppedBanner}
              />
            </div>

            {/* Avatar upload */}
            <div className="space-y-1.5 flex flex-col items-center sm:items-start">
              <Label className="text-sm font-semibold">Avatar</Label>
              <AvatarInput
                src={
                  croppedAvatar
                    ? URL.createObjectURL(croppedAvatar)
                    : user.avatarUrl || avatarPlaceholder
                }
                onImageCropped={setCroppedAvatar}
              />
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Your username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us a little bit about yourself"
                        className="resize-none min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="San Francisco, CA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={
                          field.value 
                            ? (field.value instanceof Date 
                                ? field.value.toISOString().split("T")[0] 
                                : field.value) 
                            : ""
                        } 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="professionalCategory"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5">
                    <FormLabel>Professional Category</FormLabel>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal text-left h-10 border-input"
                        onClick={() => setShowCategorySelector(true)}
                      >
                        <span className="truncate">{field.value || "Select professional category"}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/40">Select</span>
                      </Button>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <LoadingButton type="submit" loading={mutation.isPending} className="w-full sm:w-auto">
                  Save
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <CategorySelectorDialog
        open={showCategorySelector}
        onOpenChange={setShowCategorySelector}
        selectedCategory={form.watch("professionalCategory") || null}
        onSelect={(cat) => {
          form.setValue("professionalCategory", cat || "", { shouldDirty: true });
          setShowCategorySelector(false);
        }}
      />
    </>
  );
}

interface AvatarInputProps {
  src: string | StaticImageData;
  onImageCropped: (blob: Blob | null) => void;
}

function AvatarInput({ src, onImageCropped }: AvatarInputProps) {
  const [imageToCrop, setImageToCrop] = useState<File>();

  const fileInputRef = useRef<HTMLInputElement>(null);

  function onImageSelected(image: File | undefined) {
    if (!image) return;

    Resizer.imageFileResizer(
      image,
      1024,
      1024,
      "WEBP",
      100,
      0,
      (uri) => setImageToCrop(uri as File),
      "file",
    );
  }

  return (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onImageSelected(e.target.files?.[0])}
        ref={fileInputRef}
        className="sr-only hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="group relative block rounded-full overflow-hidden border border-border/50 bg-muted/30"
      >
        <Image
          src={src}
          alt="Avatar preview"
          width={128}
          height={128}
          className="size-32 flex-none rounded-full object-cover"
        />
        <span className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-black bg-opacity-35 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Camera size={24} />
        </span>
      </button>
      {imageToCrop && (
        <CropImageDialog
          src={URL.createObjectURL(imageToCrop)}
          cropAspectRatio={1}
          onCropped={onImageCropped}
          onClose={() => {
            setImageToCrop(undefined);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }}
        />
      )}
    </>
  );
}

interface BannerInputProps {
  src: string;
  onImageCropped: (blob: Blob | null) => void;
}

function BannerInput({ src, onImageCropped }: BannerInputProps) {
  const [imageToCrop, setImageToCrop] = useState<File>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onImageSelected(image: File | undefined) {
    if (!image) return;

    Resizer.imageFileResizer(
      image,
      1200,
      400,
      "WEBP",
      95,
      0,
      (uri) => setImageToCrop(uri as File),
      "file",
    );
  }

  return (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onImageSelected(e.target.files?.[0])}
        ref={fileInputRef}
        className="sr-only hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="group relative block w-full aspect-[3/1] rounded-lg overflow-hidden bg-muted/40 border border-border/55"
      >
        {src ? (
          <img
            src={src}
            alt="Banner preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-gradient-to-r from-muted/50 to-muted/20">
            Upload a header banner
          </div>
        )}
        <span className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-black bg-opacity-35 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Camera size={24} />
        </span>
      </button>
      {imageToCrop && (
        <CropImageDialog
          src={URL.createObjectURL(imageToCrop)}
          cropAspectRatio={3}
          onCropped={onImageCropped}
          onClose={() => {
            setImageToCrop(undefined);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }}
        />
      )}
    </>
  );
}

interface CategorySelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
}

const PROFESSIONAL_CATEGORIES = [
  "Advertising/Marketing",
  "Art",
  "Beauty, Cosmetic & Personal Care",
  "Blogger",
  "Clothing (Brand)",
  "Comedy Club",
  "Community Organization",
  "Digital Creator",
  "Education",
  "Entrepreneur",
  "Entertainment & Recreation",
  "Health/Beauty",
  "Editor",
  "Software Company",
  "Writer",
  "Photographer",
  "Restaurant",
  "Video Creator",
];

function CategorySelectorDialog({
  open,
  onOpenChange,
  selectedCategory,
  onSelect,
}: CategorySelectorDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = PROFESSIONAL_CATEGORIES.filter((cat) =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col p-0 overflow-hidden max-w-sm sm:max-w-md">
        <DialogHeader className="p-4 border-b border-border/40">
          <DialogTitle>Select professional category</DialogTitle>
        </DialogHeader>
        <div className="p-4 border-b border-border/30">
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-muted/30"
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border/20 max-h-[50vh] p-2 scrollbar-thin">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onSelect(cat)}
                className={cn(
                  "w-full text-left px-4 py-3 text-sm rounded-lg hover:bg-muted/40 font-medium transition-colors flex justify-between items-center",
                  selectedCategory === cat && "text-primary bg-primary/5 font-bold"
                )}
              >
                <span>{cat}</span>
                {selectedCategory === cat && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="size-4 text-primary animate-in fade-in duration-200">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))
          ) : (
            <p className="text-center text-xs text-muted-foreground py-8">
              No categories found.
            </p>
          )}
        </div>
        <DialogFooter className="p-3 border-t border-border/40 bg-muted/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onSelect(null)}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Clear Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
