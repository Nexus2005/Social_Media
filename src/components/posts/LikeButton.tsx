import kyInstance from "@/lib/ky";
import { LikeInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { HeartIcon } from "@/components/icons/InstagramIcons";
import { useToast } from "../ui/use-toast";

interface LikeButtonProps {
  postId: string;
  initialState: LikeInfo;
  hideLikes?: boolean;
}

export default function LikeButton({ postId, initialState, hideLikes }: LikeButtonProps) {
  const { toast } = useToast();

  const queryClient = useQueryClient();

  const queryKey: QueryKey = ["like-info", postId];

  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      kyInstance.get(`/api/posts/${postId}/likes`).json<LikeInfo>(),
    initialData: initialState,
    staleTime: Infinity,
  });

  const { mutate } = useMutation({
    mutationFn: () =>
      data.isLikedByUser
        ? kyInstance.delete(`/api/posts/${postId}/likes`)
        : kyInstance.post(`/api/posts/${postId}/likes`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });

      const previousState = queryClient.getQueryData<LikeInfo>(queryKey);

      queryClient.setQueryData<LikeInfo>(queryKey, () => ({
        likes:
          (previousState?.likes || 0) + (previousState?.isLikedByUser ? -1 : 1),
        isLikedByUser: !previousState?.isLikedByUser,
      }));

      return { previousState };
    },
    onError(error, variables, context) {
      queryClient.setQueryData(queryKey, context?.previousState);
      console.error(error);
      toast({
        variant: "destructive",
        description: "Something went wrong. Please try again.",
      });
    },
  });

  return (
    <button onClick={() => mutate()} className="h-11 px-2 flex items-center gap-2 hover:opacity-80 transition-opacity text-instagram-lightText dark:text-instagram-darkText">
      <HeartIcon
        isActive={data.isLikedByUser}
        className="size-6"
      />
      {!hideLikes && data.likes > 0 && (
        <span className="text-[15px] font-semibold tabular-nums text-instagram-lightText dark:text-instagram-darkText">
          {data.likes}
        </span>
      )}
    </button>
  );
}
