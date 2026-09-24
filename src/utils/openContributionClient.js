const unavailable = () =>
  Promise.reject(
    new Error("The server contribution form is unavailable in ARCUS Open.")
  );

export function contributionAcknowledgements() {
  return Promise.resolve([]);
}

export const getExpertContributionStatus = unavailable;
export const submitExpertContribution = unavailable;
