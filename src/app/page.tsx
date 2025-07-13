import { prisma } from "@/lib/db";
const Page = async () => {
  const users = prisma.user.findMany();
  const posts = prisma.post.findMany();
  return (
    <div className="font-bold text-blue-300">
      {JSON.stringify(users, null, 2)}
      {JSON.stringify(posts, null, 2)}
    </div>
  );
};
export default Page;
