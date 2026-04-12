import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("ConfidentialToken", {
    from: deployer,
    args: [deployer, "ConfidentialToken", "CTK"],
    log: true,
  });

  console.log(`ConfidentialToken contract: `, deployed.address);
};

export default func;
func.id = "deploy_confidentialToken";
func.tags = ["ConfidentialToken"];
