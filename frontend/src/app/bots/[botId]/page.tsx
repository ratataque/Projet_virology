import BotCredentialsClient from "./BotCredentialsClient";

export async function generateStaticParams() {
  return [{ botId: "default-bot" }];
}

export default async function BotCredentialsPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = await params;

  return <BotCredentialsClient botId={botId} />;
}
