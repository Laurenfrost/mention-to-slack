import * as core from "@actions/core";
import { context } from "@actions/github";
import { Context } from "@actions/github/lib/context";
import { WebhookPayload } from "@actions/github/lib/interfaces";

import {
  pickupUsername,
  pickupInfoFromGithubPayload,
  GithubRepositoryImpl,
} from "./modules/github";
import {
  buildSlackPostMessage,
  buildSlackErrorMessage,
  SlackRepositoryImpl,
} from "./modules/slack";

export type AllInputs = {
  repoToken: string;
  configurationPath: string;
  slackWebhookUrl: string;
  githubEventName: string;
  iconUrl?: string;
  botName?: string;
  runId?: string;
};

export const convertToSlackUsername = async (
  githubUsernames: string[],
  githubClient: typeof GithubRepositoryImpl,
  repoToken: string,
  configurationPath: string,
  context: Pick<Context, "repo" | "sha">
): Promise<string[]> => {
  const mapping = await githubClient.loadNameMappingConfig(
    repoToken,
    context.repo.owner,
    context.repo.repo,
    configurationPath,
    context.sha
  );

  const slackIds = githubUsernames
    .map((githubUsername) => mapping[githubUsername])
    .filter((slackId) => slackId !== undefined) as string[];

  return slackIds;
};

// Pull Request
export const execPullRequestMention = async (
  payload: WebhookPayload,
  allInputs: AllInputs,
  githubClient: typeof GithubRepositoryImpl,
  slackClient: typeof SlackRepositoryImpl,
  context: Pick<Context, "repo" | "sha">
): Promise<void> => {
  const { repoToken, configurationPath } = allInputs;
  const pullRequestGithubUsername = payload.pull_request?.user?.login;
  console.log(pullRequestGithubUsername);
  if (!pullRequestGithubUsername) {
    throw new Error("Can not find pull requested user.");
  }

  const slackIds = await convertToSlackUsername(
    [pullRequestGithubUsername],
    githubClient,
    repoToken,
    configurationPath,
    context
  );

  if (slackIds.length === 0) {
    return;
  }

  const action = payload.action;
  const title = payload.pull_request?.title;
  const url = payload.pull_request?.html_url;
  const prSlackUserId = slackIds[0];

  const message = `<@${prSlackUserId}> has <${action}> pull request <${url}|${title}>.`;
  console.log(message);
  const { slackWebhookUrl, iconUrl, botName } = allInputs;

  await slackClient.postToSlack(slackWebhookUrl, message, { iconUrl, botName });
};

// PR comment mentions
export const execPrReviewRequestedCommentMention = async (
  payload: WebhookPayload,
  allInputs: AllInputs,
  githubClient: typeof GithubRepositoryImpl,
  slackClient: typeof SlackRepositoryImpl,
  context: Pick<Context, "repo" | "sha">
): Promise<void> => {
  const { repoToken, configurationPath } = allInputs;
  const commentGithubUsername = payload.comment?.user?.login as string;
  const pullRequestedGithubUsername = payload.issue?.user?.login as string;

  if (!commentGithubUsername) {
    throw new Error("Can not find comment user.");
  }
  if (!pullRequestedGithubUsername) {
    throw new Error("Can not find pull request user.");
  }

  const slackIds = await convertToSlackUsername(
    [commentGithubUsername, pullRequestedGithubUsername],
    githubClient,
    repoToken,
    configurationPath,
    context
  );

  if (slackIds.length === 0) {
    return;
  }

  const action = payload.action as string;
  const pr_title = payload.issue?.title as string;
  const pr_state = payload.issue?.state as string;
  const comment_body = payload.comment?.body as string;
  const comment_url = payload.comment?.html_url as string;
  const commentSlackUserId = slackIds[0];
  const pullRequestedSlackUserId = slackIds[1];

  // show comment text as quote text.
  const comment_lines = comment_body.split("\n")
  var comment_as_quote = "";
  comment_lines.forEach(line => {
    core.warning(line)
    comment_as_quote += (">" + line);
  })

  const message = `<@${commentSlackUserId}> has <${action}> a comment on a <${pr_state}> pull request <@${pullRequestedSlackUserId}> <${pr_title}>:\n${comment_as_quote}\n${comment_url}.`;
  core.warning(message)
  const { slackWebhookUrl, iconUrl, botName } = allInputs;

  await slackClient.postToSlack(slackWebhookUrl, message, { iconUrl, botName });
};

// Review Requested
export const execPrReviewRequestedMention = async (
  payload: WebhookPayload,
  allInputs: AllInputs,
  githubClient: typeof GithubRepositoryImpl,
  slackClient: typeof SlackRepositoryImpl,
  context: Pick<Context, "repo" | "sha">
): Promise<void> => {
  const { repoToken, configurationPath } = allInputs;
  const requestedGithubUsername =
    payload.requested_reviewer?.login || payload.requested_team?.name;

  if (!requestedGithubUsername) {
    throw new Error("Can not find review requested user.");
  }

  const slackIds = await convertToSlackUsername(
    [requestedGithubUsername],
    githubClient,
    repoToken,
    configurationPath,
    context
  );

  if (slackIds.length === 0) {
    return;
  }

  const title = payload.pull_request?.title;
  const url = payload.pull_request?.html_url;
  const requestedSlackUserId = slackIds[0];
  const requestUsername = payload.sender?.login;

  const message = `<@${requestedSlackUserId}> has been requested to review <${url}|${title}> by ${requestUsername}.`;
  const { slackWebhookUrl, iconUrl, botName } = allInputs;

  await slackClient.postToSlack(slackWebhookUrl, message, { iconUrl, botName });
};

// In progress: Issue comment mentions
export const execIssueCommentMention = async (
  payload: WebhookPayload,
  allInputs: AllInputs,
  githubClient: typeof GithubRepositoryImpl,
  slackClient: typeof SlackRepositoryImpl,
  context: Pick<Context, "repo" | "sha">
): Promise<void> => {
  const { repoToken, configurationPath } = allInputs;
  const commentGithubUsername = payload.comment?.user?.login as string;
  const issueGithubUsername = payload.issue?.user?.login as string;

  if (!{commentGithubUsername}) {
    throw new Error("Can not find comment user.");
  }
  if (!{issueGithubUsername}) {
    throw new Error("Can not find issue user.");
  }

  const slackIds = await convertToSlackUsername(
    [commentGithubUsername, issueGithubUsername],
    githubClient,
    repoToken,
    configurationPath,
    context
  );

  if (slackIds.length === 0) {
    return;
  }

  const action = payload.action as string;
  const issue_title = payload.issue?.title as string;
  const issue_state = payload.issue?.state as string;
  const comment_body = payload.comment?.body as string;
  const comment_url = payload.comment?.html_url as string;
  const commentSlackUserId = slackIds[0];
  const issueSlackUserId = slackIds[1];

  // show comment text as quote text.
  const comment_lines = comment_body.split("\n")
  var comment_as_quote = "";
  comment_lines.forEach(line => {
    core.warning(line)
    comment_as_quote += (">" + line);
  })

  const message = `<@${commentSlackUserId}> has <${action}> a comment on a <${issue_state}> issue <@${issueSlackUserId}> <${issue_title}>:\n${comment_as_quote}\n${comment_url}.`;
  core.warning(message)
  const { slackWebhookUrl, iconUrl, botName } = allInputs;

  await slackClient.postToSlack(slackWebhookUrl, message, { iconUrl, botName });
};

export const execNormalMention = async (
  payload: WebhookPayload,
  allInputs: AllInputs,
  githubClient: typeof GithubRepositoryImpl,
  slackClient: typeof SlackRepositoryImpl,
  context: Pick<Context, "repo" | "sha">
): Promise<void> => {
  const info = pickupInfoFromGithubPayload(payload);

  if (info.body === null) {
    return;
  }

  const githubUsernames = pickupUsername(info.body);
  if (githubUsernames.length === 0) {
    return;
  }

  const { repoToken, configurationPath } = allInputs;
  const slackIds = await convertToSlackUsername(
    githubUsernames,
    githubClient,
    repoToken,
    configurationPath,
    context
  );

  if (slackIds.length === 0) {
    return;
  }

  const message = buildSlackPostMessage(
    slackIds,
    info.title,
    info.url,
    info.body,
    info.senderName
  );

  const { slackWebhookUrl, iconUrl, botName } = allInputs;

  await slackClient.postToSlack(slackWebhookUrl, message, { iconUrl, botName });
};

const buildCurrentJobUrl = (runId: string) => {
  const { owner, repo } = context.repo;
  return `https://github.com/${owner}/${repo}/actions/runs/${runId}`;
};

export const execPostError = async (
  error: Error,
  allInputs: AllInputs,
  slackClient: typeof SlackRepositoryImpl
): Promise<void> => {
  const { runId } = allInputs;
  const currentJobUrl = runId ? buildCurrentJobUrl(runId) : undefined;
  const message = buildSlackErrorMessage(error, currentJobUrl);

  core.warning(message);

  const { slackWebhookUrl, iconUrl, botName } = allInputs;

  await slackClient.postToSlack(slackWebhookUrl, message, { iconUrl, botName });
};

const getAllInputs = (): AllInputs => {
  const slackWebhookUrl = core.getInput("slack-webhook-url", {
    required: true,
  });

  if (!slackWebhookUrl) {
    core.setFailed("Error! Need to set `slack-webhook-url`.");
  }

  const repoToken = core.getInput("repo-token", { required: true });
  if (!repoToken) {
    core.setFailed("Error! Need to set `repo-token`.");
  }

  const githubEventName = core.getInput("github-event-name", { required: true})
  if (!githubEventName) {
    core.setFailed("Error! Need to set `github-event-name");
  }

  const iconUrl = core.getInput("icon-url", { required: false });
  const botName = core.getInput("bot-name", { required: false });
  const configurationPath = core.getInput("configuration-path", {
    required: true,
  });
  const runId = core.getInput("run-id", { required: false });

  return {
    repoToken,
    configurationPath,
    slackWebhookUrl,
    githubEventName,
    iconUrl,
    botName,
    runId,
  };
};

export const main = async (): Promise<void> => {
  const { payload } = context;
  const allInputs = getAllInputs();

  try {
    const message1 = `githubEventName is <${allInputs.githubEventName}>.`;
    console.log(message1);
    const message2 = `eventName is <${context.eventName}>.`;
    console.log(message2);
    const message3 = `action is <${context.action}>.`;
    console.log(message3);
    const message4 = `actor is <${context.actor}>.`;
    console.log(message4);
    const message5 = `issue is <${payload.issue?.pull_request}>.`;
    console.log(message5);

    if (payload.action === "review_requested") {
      await execPrReviewRequestedMention(
        payload,
        allInputs,
        GithubRepositoryImpl,
        SlackRepositoryImpl,
        context
      );
      return;
    }
    
    if (context.eventName === "pull_request") {
      await execPullRequestMention(
        payload,
        allInputs,
        GithubRepositoryImpl,
        SlackRepositoryImpl,
        context
      );
      return;
    }

    if (context.eventName === "issue_comment") {
      if (payload.issue?.pull_request == [null,undefined]) {
        core.warning("This comment is on an Issue.")
        await execIssueCommentMention(
          payload,
          allInputs,
          GithubRepositoryImpl,
          SlackRepositoryImpl,
          context
        );
        return;
      }
      else {
        core.warning("This comment is on a pull request.")
        await execPrReviewRequestedCommentMention(
          payload,
          allInputs,
          GithubRepositoryImpl,
          SlackRepositoryImpl,
          context
        );
        return;
      }
      throw new Error("Can not resolve this issue_comment.")
    }

    // await execNormalMention(
    //   payload,
    //   allInputs,
    //   GithubRepositoryImpl,
    //   SlackRepositoryImpl,
    //   context
    // );
    throw new Error("Unexpected event.");
  } catch (error) {
    await execPostError(error, allInputs, SlackRepositoryImpl);
    core.warning(JSON.stringify({ payload }));
  }
};
