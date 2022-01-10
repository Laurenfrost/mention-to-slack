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

type SlackPostParam = {
  blocks: any[];
  username: string;
  icon_emoji?: string;
};

const defaultBotName = "Github Mention To Slack";
const defaultIconEmoji = ":octocat:";

export const SlackRepositoryImpl = {
  postToSlack: async (
    webhookUrl: string,
    messageBlocks: any[],
    botName?: string
  ): Promise<void> => {
    botName = (() => {
      if (botName && botName !== "") {
        return botName;
      }
      return defaultBotName;
    })();

    const slackPostParam: SlackPostParam = {
      blocks: messageBlocks,
      username: botName,
      icon_emoji: defaultIconEmoji
    };

    await axios.post(webhookUrl, JSON.stringify(slackPostParam), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
