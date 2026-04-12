import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("PublicDecryptionVerifier", {
    from: deployer,
    args: [deployer],
    log: true,
  });

  console.log(`PublicDecryptionVerifier contract: `, deployed.address);
};

export default func;
func.id = "deploy_publicDecryptionVerifier";
func.tags = ["PublicDecryptionVerifier"];
