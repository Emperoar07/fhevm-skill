import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Duration: 7 days from now
  const duration = 7 * 24 * 60 * 60;

  const deployed = await deploy("SealedBidAuction", {
    from: deployer,
    args: [duration, deployer],
    log: true,
  });

  console.log(`SealedBidAuction contract: `, deployed.address);
  console.log(`Auction ends: `, new Date((Math.floor(Date.now() / 1000) + duration) * 1000).toISOString());
};

export default func;
func.id = "deploy_sealedBidAuction";
func.tags = ["SealedBidAuction"];
