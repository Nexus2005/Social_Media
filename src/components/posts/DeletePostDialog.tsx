import { PostData } from "@/lib/types";
import { Dialog, DialogContent } from "../ui/dialog";
import { useDeletePostMutation } from "./mutations";

interface DeletePostDialogProps {
  post: PostData;
  open: boolean;
  onClose: () => void;
}

export default function DeletePostDialog({
  post,
  open,
  onClose,
}: DeletePostDialogProps) {
  const mutation = useDeletePostMutation();

  function handleOpenChange(open: boolean) {
    if (!open || !mutation.isPending) {
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#181d26] border-none text-white max-w-[340px] rounded-[22px] p-6.5 shadow-2xl [&>button]:hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[19px] font-bold text-zinc-100 leading-tight">Delete post</h2>
          <p className="text-zinc-400 text-[14.5px] leading-normal font-medium pr-2">
            Are you sure you want to delete this post?
          </p>
        </div>
        <div className="flex justify-end gap-6 pt-4.5">
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="text-[#53bdeb] hover:text-[#53bdeb]/85 active:scale-95 text-[15px] font-bold transition-all bg-transparent border-none outline-none cursor-pointer disabled:opacity-50"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate(post.id, { onSuccess: onClose })}
            disabled={mutation.isPending}
            className="text-[#f15e5e] hover:text-[#f15e5e]/85 active:scale-95 text-[15px] font-bold transition-all bg-transparent border-none outline-none cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            type="button"
          >
            {mutation.isPending ? (
              <span className="size-3.5 rounded-full border-2 border-[#f15e5e] border-t-transparent animate-spin shrink-0" />
            ) : null}
            <span>Delete</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
