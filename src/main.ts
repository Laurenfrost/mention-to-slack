import * as core from "@actions/core";
import {context} from "@actions/github";
import {Context} from "@actions/github/lib/context";
import {WebhookPayload} from "@actions/github/lib/interfaces";

import {GithubRepositoryImpl} from "./modules/github";
import {buildSlackErrorMessage, SlackRepositoryImpl,} from "./modules/slack";

export type AllInputs = {
  repoToken: string;
  configurationPath: string;
  slackWebhookUrl: string;
  debugFlag: boolean;
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
  // const slackIds = githubUsernames
  //   .map((githubUsername) => mapping[githubUsername])
  //   .filter((slackId) => slackId !== undefined) as string[];
  return githubUsernames.map(
      (githubUsername) => {
        const slackId = mapping[githubUsername];
        return (slackId !== undefined) ? slackId : githubUsername;
      }
  ) as string[];
};

// Pull Request
export const execPullRequestMention = async (
  payload: WebhookPayload,
  allInputs: AllInputs,
  githubClient: typeof GithubRepositoryImpl,
  slackClient: typeof SlackRepositoryImpl,
  context: Pick<Context, "repo" | "sha">
): Promise<void> => {
  const { repoToken, configurationPath, slackWebhookUrl, botName } = allInputs;
  const action = payload.action as string;
  const prNumber = payload.pull_request?.number as number;
  const prTitle = payload.pull_request?.title as string;
  const prUrl = payload.pull_request?.html_url as string;
  const prBody = payload.pull_request?.body as string;
  const prGithubUserAvatar = payload.pull_request?.user.avatar_url as string;
  const prGithubUsername = payload.pull_request?.user.login as string;
  const slackIds = await convertToSlackUsername(
      [prGithubUsername],
      githubClient,
      repoToken,
      configurationPath,
      context
  );
  const prSlackUserId = slackIds[0];
  const messageBlocks = [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": `Pull Request #${prNumber} ${action}`,
          "emoji": true
        }
      },
      {
        "type": "context",
        "elements": [
          {
            "type": "image",
            "image_url": prGithubUserAvatar,
            "alt_text": `GitHub User: ${prGithubUsername}`
          },
          {
            "type": "mrkdwn",
            "text": `*<@${prSlackUserId}>* has ${action} this pull request.`
          },
          {
            "type": "mrkdwn",
            "text": `*<${prUrl}|${prTitle}>*\n<${prUrl}|${prUrl}>`
          },
          {
            "type": "mrkdwn",
            "text": (prBody && prBody != "") ? prBody : "_No description provided._"
          }
        ]
      }
    ];
  await slackClient.postToSlack(slackWebhookUrl, messageBlocks, botName);
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
  const action = payload.action as string;
  const prNumber = payload.pull_request?.number as number;
  const prTitle = payload.issue?.title as string;
  const prUrl = payload.pull_request?.html_url as string;
  // const prState = payload.issue?.state as string;
  const commentBody = payload.comment?.body as string;
  const commentUrl = payload.comment?.html_url as string;
  const commentUsername = payload.comment?.user?.login as string;
  const commentUserAvatar = payload.comment?.user?.avatar_url as string;
  const prUsername = payload.issue?.user?.login as string;
  const slackIds = await convertToSlackUsername(
    [commentUsername, prUsername],
    githubClient,
    repoToken,
    configurationPath,
    context
  );
  const commentSlackUserId = slackIds[0];
  const prSlackUserId = slackIds[1];
  // show comment text as quote text.
  // const comment_lines = commentBody.split("\n")
  // let comment_as_quote = "";
  // comment_lines.forEach(line => {
  //   core.warning(line)
  //   comment_as_quote += (">" + line);
  // })
  const messageBlocks = [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": `Comment on Pull Request #${prNumber}`,
        "emoji": true
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": `\n*<${prUrl}|${prTitle}>*\n<${prUrl}|${prUrl}>`
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": commentUserAvatar,
          "alt_text": "GitHub User"
        },
        {
          "type": "mrkdwn",
          "text": `*<@${commentSlackUserId}>* has ${action} a comment review. *<@${prSlackUserId}>*\n<${commentUrl}|${commentUrl}>`
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": (commentBody && commentBody != "") ? commentBody : "_No description provided._"
        }
      ]
    }
  ];
  const { slackWebhookUrl, botName } = allInputs;

  await slackClient.postToSlack(slackWebhookUrl, messageBlocks, botName);
};

// Review Requested
export const execPrReviewRequestedMention = async (
  payload: WebhookPayload,
  allInputs: AllInputs,
  githubClient: typeof GithubRepositoryImpl,
  slackClient: typeof SlackRepositoryImpl,
  context: Pick<Context, "repo" | "sha">
): Promise<void> => {
  const { repoToken, configurationPath, slackWebhookUrl, botName } = allInputs;
  const prNumber = payload.pull_request?.number as number;
  const prTitle = payload.pull_request?.title as string;
  const prUrl = payload.pull_request?.html_url as string;
  const reviewerUsername = payload.requested_reviewer?.login || payload.requested_team?.name as string;
  const reviewerUserAvatar = payload.requested_reviewer?.avatar_url as string;
  const requestUsername = payload.sender?.login as string;
  const slackIds = await convertToSlackUsername(
    [reviewerUsername, requestUsername],
    githubClient,
    repoToken,
    configurationPath,
    context
  );
  const reviewerSlackUserId = slackIds[0];
  const requestSlackUserId = slackIds[1];
  const messageBlocks = [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": `Reviewer Requested on Pull Request #${prNumber}`,
        "emoji": true
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": `\n*<${prUrl}|${prTitle}>*\n<${prUrl}|${prUrl}>`
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": reviewerUserAvatar,
          "alt_text": "GitHub User"
        },
        {
          "type": "mrkdwn",
          "text": `*<@${reviewerSlackUserId}>* is requested by *<@${requestSlackUserId}>*.`
        }
      ]
    }
  ];
  await slackClient.postToSlack(slackWebhookUrl, messageBlocks, botName);
};

// pull_request_review
export const execPullRequestReviewMention = async (
  payload: WebhookPayload,
  allInputs: AllInputs,
  githubClient: typeof GithubRepositoryImpl,
  slackClient: typeof SlackRepositoryImpl,
  context: Pick<Context, "repo" | "sha">
): Promise<void> => {
  const { repoToken, configurationPath, slackWebhookUrl, botName } = allInputs;
  const action = payload.action as string;
  const prNumber = payload.pull_request?.number as number;
  const prTitle = payload.pull_request?.title as string;
  const prUrl = payload.pull_request?.html_url as string;
  // const prState = payload.pull_request?.state as string;
  const reviewBody = payload.review?.body as string;
  const reviewState = payload.review?.state as string;
  const reviewUrl = payload.review?.html_url as string;
  const reviewerUsername = payload.review?.user?.login as string;
  const reviewerUserAvatar = payload.review?.user?.avatar_url as string;
  const prUsername = payload.pull_request?.user.login as string;
  const slackIds = await convertToSlackUsername(
    [reviewerUsername, prUsername],
    githubClient,
    repoToken,
    configurationPath,
    context
  );
  const reviewerSlackUserId = slackIds[0];
  const prSlackUserId = slackIds[1];
  const messageBlocks = [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": (reviewState === "approved") ?
            `Approved on Pull Request #${prNumber}` :
            `Comment on Pull Request #${prNumber}`,
        "emoji": true
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": `\n*<${prUrl}|${prTitle}>*\n<${prUrl}|${prUrl}>`
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": reviewerUserAvatar,
          "alt_text": "GitHub User"
        },
        {
          "type": "mrkdwn",
          "text": (reviewState === "approved") ?
              `<@${reviewerSlackUserId}> has *Approved* Pull Request *<@${prSlackUserId}>*.` :
              `*<@${reviewerSlackUserId}>* has ${action} a comment review *<@${prSlackUserId}>*.\n<${reviewUrl}|${reviewUrl}>`
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": `${(reviewBody && reviewBody != "") ? reviewBody : "_No description provided._"}`
        }
      ]
    }
  ];
  await slackClient.postToSlack(slackWebhookUrl, messageBlocks, botName);
};

// pull_request_review_comment
export const execPullRequestReviewComment = async (
  payload: WebhookPayload,
  allInputs: AllInputs,
  githubClient: typeof GithubRepositoryImpl,
  slackClient: typeof SlackRepositoryImpl,
  context: Pick<Context, "repo" | "sha">
): Promise<void> => {
  const { repoToken, configurationPath, slackWebhookUrl, botName } = allInputs;
  const action = payload.action as string;
  const prNumber = payload.pull_request?.number as number
  const prTitle = payload.pull_request?.title as string;
  const prUrl = payload.pull_request?.html_url as string;
  // const prState = payload.pull_request?.state as string;
  const commentBody = payload.comment?.body as string;
  const changeFilePath = payload.comment?.path as string;
  // const diffHunk = payload.comment?.diff_hunk as string;
  const commentUrl = payload.comment?.html_url as string;
  const commentUsername = payload.comment?.user?.login as string;
  const commentUserAvatar = payload.comment?.user?.avatar_url as string;
  const prUsername = payload.pull_request?.user?.login as string;
  // const assigneeUsername = payload.pull_request?.assignee.login as string
  // const reviewerUsername = payload.pull_request?.requested_reviewers.login as string
  const slackIds = await convertToSlackUsername(
      [commentUsername, prUsername],
      githubClient,
      repoToken,
      configurationPath,
      context
  );
  const commentSlackUserId = slackIds[0];
  const prSlackUserId = slackIds[1];

  const messageBlocks = [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": `Comment on Pull Request #${prNumber}`,
        "emoji": true
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": `\n*<${prUrl}|${prTitle}>*\n<${prUrl}|${prUrl}>`
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": commentUserAvatar,
          "alt_text": "GitHub User"
        },
        {
          "type": "mrkdwn",
          "text": `*<@${commentSlackUserId}>* has ${action} a comment review. *<@${prSlackUserId}>*\n<${commentUrl}|${commentUrl}>`
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": `*${changeFilePath}*\n${(commentBody && commentBody != "") ? commentBody : "_No description provided._"}`
        }
      ]
    }
  ];

  await slackClient.postToSlack(slackWebhookUrl, messageBlocks, botName);
};

// Issue metion
export const execIssueMention = async (
  payload: WebhookPayload,
  allInputs: AllInputs,
  githubClient: typeof GithubRepositoryImpl,
  slackClient: typeof SlackRepositoryImpl,
  context: Pick<Context, "repo" | "sha">
): Promise<void> => {
  const { repoToken, configurationPath, slackWebhookUrl, botName } = allInputs;
  const action = payload.action as string;
  const issueNumber = payload.issue?.number as number
  const issueTitle = payload.issue?.title as string;
  // const issueState = payload.issue?.state as string;
  const issueBody = payload.issue?.body as string;
  const issueUrl = payload.issue?.html_url as string;
  const issueUsername = payload.issue?.user?.login as string;
  const issueUserAvatar = payload.issue?.user?.avatar_url as string;
  const slackIds = await convertToSlackUsername(
    [issueUsername],
    githubClient,
    repoToken,
    configurationPath,
    context
  );
  const issueSlackUserId = slackIds[0];
  const messageBlocks = [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": `Issue #${issueNumber} ${action}`,
        "emoji": true
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": `*<${issueUrl}|${issueTitle}>*\n<${issueUrl}|${issueUrl}>`
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": issueUserAvatar,
          "alt_text": "GitHub User"
        },
        {
          "type": "mrkdwn",
          "text": `*<@${issueSlackUserId}>* has ${action} an issue.`
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": (issueBody && issueBody != "")? issueBody : "_No description provided._"
        }
      ]
    }
  ]

  await slackClient.postToSlack(slackWebhookUrl, messageBlocks, botName);
};

// Issue comment mentions
export const execIssueCommentMention = async (
  payload: WebhookPayload,
  allInputs: AllInputs,
  githubClient: typeof GithubRepositoryImpl,
  slackClient: typeof SlackRepositoryImpl,
  context: Pick<Context, "repo" | "sha">
): Promise<void> => {
  const { repoToken, configurationPath, slackWebhookUrl, botName } = allInputs;
  const action = payload.action as string;
  const issueNumber = payload.issue?.number as number
  const issueTitle = payload.issue?.title as string;
  // const issueState = payload.issue?.state as string;
  const issueUrl = payload.issue?.html_url as string;
  const commentBody = payload.comment?.body as string;
  const commentUrl = payload.comment?.html_url as string;
  const commentUsername = payload.comment?.user?.login as string;
  const commentUserAvatar = payload.comment?.user?.avatar_url as string;
  const issueUsername = payload.issue?.user?.login as string;
  const slackIds = await convertToSlackUsername(
    [commentUsername, issueUsername],
    githubClient,
    repoToken,
    configurationPath,
    context
  );
  const commentSlackUserId = slackIds[0];
  const issueSlackUserId = slackIds[1];
  const messageBlocks = [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": `Issue #${issueNumber} ${action}`,
        "emoji": true
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": `*<${issueUrl}|${issueTitle}>*\n<${issueUrl}|${issueUrl}>`
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "image",
          "image_url": commentUserAvatar,
          "alt_text": "GitHub User"
        },
        {
          "type": "mrkdwn",
          "text": `*<@${commentSlackUserId}>* has ${action} a comment *<@${issueSlackUserId}>*.\n<${commentUrl}|${commentUrl}>`
        }
      ]
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": (commentBody && commentBody != "")? commentBody : "_No description provided._"
        }
      ]
    }
  ]
  await slackClient.postToSlack(slackWebhookUrl, messageBlocks, botName);
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
  const { runId, slackWebhookUrl, botName } = allInputs;
  const currentJobUrl = runId ? buildCurrentJobUrl(runId) : undefined;
  const message = buildSlackErrorMessage(error, currentJobUrl);
  const messageBlocks = [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": `Error Occurred`,
        "emoji": true
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": message
        }
      ]
    }
  ]
  await slackClient.postToSlack(slackWebhookUrl, messageBlocks, botName);
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

  const debugFlagString = core.getInput("debug-flag", { required: false})
  let debugFlag = false;
  if (!debugFlagString) {
    core.warning("Set debugFlag as false by default.");
    debugFlag = false;
  }
  else if (debugFlagString === "true") {
    core.warning("Set debugFlag as true.");
    debugFlag = true;
  } else if (debugFlagString === "false")  {
    core.warning("Set debugFlag as false.");
    debugFlag = false;
  } else {
    core.setFailed("Unknown input. You should set true or false for a debug flag.")
  }
  const botName = core.getInput("bot-name", { required: false });
  const configurationPath = core.getInput("configuration-path", {
    required: true,
  });

  return {
    repoToken,
    configurationPath,
    slackWebhookUrl,
    debugFlag,
    botName,
  };
};

export const main = async (): Promise<void> => {
  const { payload } = context;
  const allInputs = getAllInputs();

  try {
    if (allInputs.debugFlag) {
      core.warning(JSON.stringify(context))
    }

    if (payload.action === "review_requested") {
      core.info("This action is a review requested.")
      await execPrReviewRequestedMention(
        payload,
        allInputs,
        GithubRepositoryImpl,
        SlackRepositoryImpl,
        context
      );
      return;
    }

    switch (context.eventName) {
      case "pull_request": {
        core.info("This action is a pull request.")
        await execPullRequestMention(
            payload,
            allInputs,
            GithubRepositoryImpl,
            SlackRepositoryImpl,
            context
        );
        return;
      }
      case "issue_comment": {
        if (payload.issue?.pull_request == undefined) {
          core.info("This comment is on an Issue.")
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
          core.info("This comment is on a pull request.")
          await execPrReviewRequestedCommentMention(
              payload,
              allInputs,
              GithubRepositoryImpl,
              SlackRepositoryImpl,
              context
          );
          return;
        }
      }
      case "issues": {
        core.info("This action is a issue.")
        await execIssueMention(
            payload,
            allInputs,
            GithubRepositoryImpl,
            SlackRepositoryImpl,
            context
        );
        return;
      }
      case "pull_request_review": {
        core.info("This action is a pull_request_review.")
        await execPullRequestReviewMention(
            payload,
            allInputs,
            GithubRepositoryImpl,
            SlackRepositoryImpl,
            context
        );
        return;
      }
      case "pull_request_review_comment": {
        core.info("This action is a pull_request_review_comment.")
        await execPullRequestReviewComment(
            payload,
            allInputs,
            GithubRepositoryImpl,
            SlackRepositoryImpl,
            context
        );
        return;
      }
    }
    core.error("Unexpected event.");
  } catch (error) {
    await execPostError(error, allInputs, SlackRepositoryImpl);
    core.warning(JSON.stringify({ payload }));
  }
};
