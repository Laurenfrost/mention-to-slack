import axios from "axios";

export const buildSlackErrorMessage = (
  error: Error,
  currentJobUrl?: string
): string => {
  const jobTitle = "mention-to-slack action";
  const jobLinkMessage = currentJobUrl
    ? `<${currentJobUrl}|${jobTitle}>`
    : jobTitle;

  return [
    `❗ An internal error occurred in ${jobLinkMessage}`,
    "",
    "```",
    error.stack || error.message,
    "```",
  ].join("\n");
};

export const SlackRepositoryImpl = {
  postToSlack: async (
    webhookUrl: string,
    messageBlocks: any[],
    botName?: string
  ): Promise<void> => {
    const defaultBotName = "Github Mention To Slack";
    const defaultIconEmoji = ":octocat:";
    const slackPostParam = {
      "blocks": messageBlocks,
      "username": (botName && botName !== "") ? botName : defaultBotName,
      "icon_emoji": defaultIconEmoji
    };

    await axios.post(webhookUrl, JSON.stringify(slackPostParam), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
