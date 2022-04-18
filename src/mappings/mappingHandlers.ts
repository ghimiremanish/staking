import {SubstrateBlock} from "@subql/types";
import {Account, Reward} from "../types";

function getId(account_id, day=0){
    let date = new Date()
    let id = account_id + '_' + date.getFullYear() + '_' + date.getMonth()
    
    day?id = id + '_' + date.getDay():null
    
    return id
}

export async function handleBlock(block: SubstrateBlock): Promise<void> {    
    let blockNumber = block.block.header.number.toBigInt();
    logger.info("Processing events in block " + blockNumber);

    let events = block.events;
    for (let i = 0; i < events.length; i++) {
        let eventRecord = events[i];
        let method = eventRecord.event.method
        let section = eventRecord.event.section

        if (section="staking") {
            switch (method) {
                case "Rewarded":
                    logger.info("====> event record => "+eventRecord.event.toJSON())
                    const [account, amount] = eventRecord.event.data.toJSON() as [string, bigint];

                    let record = await Account.get(getId(account));
                    if (!record) {
                        record = Account.create({
                            id: getId(account),
                            account: account
                        });
                    }
                    
                    record.accountType = 'validator';
                    record.amount = record.amount?record.amount+BigInt(amount):amount;
                    record.blockNumber = blockNumber;
                    
                    await record.save().then((ress) => {
                        logger.info("totalAccount save =>"+ ress)
                    })
                    .catch((err) => {
                        logger.info("totalAccount error => " + err)
                    });

                    //save indivisual staking
                    let stake = Reward.create({
                        id: getId(account,1),
                        account: account,
                        accountType: 'validator',
                        amount: amount
                    })
                   
                    await stake.save().then((result) => {
                        logger.info("====indivisual stake save => "+ result)
                    })
                    .catch((error) => {
                        logger.info("indivisual stake error => " + error)
                    });

                    break;
                default:
                    break;
            }
        }

    }
}