export const ARCUS_API_CONTRACT_VERSION = "arcus-api-contract-v4";

export function matchesArcusApiContract({
  accountStatus,
  contractVersion,
  registerStatus,
  sessionOk,
} = {}) {
  return (
    sessionOk === true &&
    registerStatus === 405 &&
    accountStatus === 401 &&
    contractVersion === ARCUS_API_CONTRACT_VERSION
  );
}
