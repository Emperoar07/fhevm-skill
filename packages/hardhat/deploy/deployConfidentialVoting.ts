import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deadline: 7 days from now
  const deadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

  const deployed = await deploy("ConfidentialVoting", {
    from: deployer,
    args: [deadline, deployer],
    log: true,
  });

  console.log(`ConfidentialVoting contract: `, deployed.address);
  console.log(`Deadline: `, new Date(deadline * 1000).toISOString());
};

export default func;
func.id = "deploy_confidentialVoting";
func.tags = ["ConfidentialVoting"];
