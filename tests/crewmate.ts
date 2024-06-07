import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Crewmate } from "../target/types/crewmate"
import keys from '../keys/users.json'
import key2 from '../keys/user2.json'
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createMint, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, mintTo, NATIVE_MINT } from "@solana/spl-token";
import { BN } from "bn.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

// const connection = new Connection("https://api.devnet.solana.com")
const connection = new Connection("http://localhost:8899")
const GLOBAL_SEED = "GLOBAL_SEED"
const LOCK_SEED = "LOCK_SEED"
const DAY = 86400
const id = new BN(15)
// const lockSeeds = ["a", "b", "c"]

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toBytesUInt64(num) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(num));
  return buf;
}

describe("crewmate-j", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  // custom setting 
  const user = Keypair.fromSecretKey(bs58.decode(keys.key))
  // const user = Keypair.fromSecretKey(new Uint8Array(keys))
  const user2 = Keypair.fromSecretKey(new Uint8Array(key2))
  let mint: PublicKey
  let tokenAta: PublicKey
  const tokenDecimal = 9
  const amount = new BN(1000000000).mul(new BN(10 ** tokenDecimal))
  const poolId = new PublicKey("5cvj5rEEocG5Wvh3oJuY6MoYj7gVZd8aoXSLZjDY6W4W") // actually it's token mint

  const lockDay = 2
  console.log("Admin's wallet address is : ", user.publicKey.toBase58())
  
  const program = anchor.workspace.Crewmate as Program<Crewmate>;
  it("Airdrop to admin wallet", async () => {
    console.log(`Requesting airdrop to admin for 1SOL : ${user.publicKey.toBase58()}`)
    // 1 - Request Airdrop
    const signature = await connection.requestAirdrop(
      user.publicKey,
      10 ** 9
    );
    // 2 - Fetch the latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    // 3 - Confirm transaction success
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature
    }, 'finalized');
    console.log("admin wallet balance : ", (await connection.getBalance(user.publicKey)) / 10 ** 9, "SOL")
  })

  it("Airdrop to user wallet", async () => {
    console.log("Created a user, address is ", user2.publicKey.toBase58())
    console.log(`Requesting airdrop for another user ${user.publicKey.toBase58()}`)
    // 1 - Request Airdrop
    const signature = await connection.requestAirdrop(
      user2.publicKey,
      10 ** 9
    );
    // 2 - Fetch the latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    // 3 - Confirm transaction success
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature
    }, 'finalized');
    console.log("user balance : ", (await connection.getBalance(user.publicKey)) / 10 ** 9, "SOL")
  })
  
  it("Mint token to user wallet", async () => {
    console.log("Trying to reate and mint token to user's wallet")
    console.log("Here, contract uses this token as LP token")
    console.log(await connection.getBalance(user.publicKey) / LAMPORTS_PER_SOL)
    console.log(await connection.getBalance(user2.publicKey) / LAMPORTS_PER_SOL)
    //create mint
    try {
      mint = await createMint(connection, user, user.publicKey, user.publicKey, tokenDecimal)
      console.log('mint address: ' + mint.toBase58());

      tokenAta = (await getOrCreateAssociatedTokenAccount(connection, user, mint, user.publicKey)).address
      console.log('token account address: ' + tokenAta.toBase58());

      //minting 100 new tokens to the token address we just created
      await mintTo(connection, user, mint, tokenAta, user.publicKey, BigInt(amount.toString()))
      const tokenBalance = await connection.getTokenAccountBalance(tokenAta)
      tokenBalance.value.uiAmount
      console.log("tokenBalance in user:", tokenBalance.value.uiAmount)
      console.log('token successfully minted');
    } catch (error) {
      console.log("Token creation error \n", error)
    }
  })

  it("Is initialized!", async () => {
    console.log("Admin initializes the smart contract")
    try {
      const [globalState] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        program.programId
      )
      console.log("🚀 ~ it ~ globalState:", globalState.toBase58())

      const tx = await program.methods.initialize()
        .accounts({
          admin: user.publicKey,
          globalState,
          systemProgram: SystemProgram.programId
        })
        .signers([user])
        .transaction()
      tx.feePayer = user.publicKey
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      console.log(await connection.simulateTransaction(tx))
      await sendAndConfirmTransaction(connection, tx, [user])
      console.log("Below is global state value")
      const globalStateValue = await program.account.globalState.fetch(globalState)
      console.log("globalStateValue: \n", globalStateValue)
    } catch (error) {
      console.log("error in initialization :", error)
    }
  })

  it("Lock lp token 1", async () => {
    console.log("Trying to lock 50% of all lp token")
    try {
      const [globalState] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        program.programId
      )
      const lockStates = await program.account.lockState.all()
      const [lockState] = PublicKey.findProgramAddressSync(
        [user.publicKey.toBuffer(), mint.toBuffer(),  new anchor.BN(0).toArrayLike(Buffer, "le", 8),],
        program.programId
      )
      console.log("🚀 ~ it ~ lockState:", lockState.toBase58())


      // const locks = await program.account.lockState.all()
      // const lockStates = []
      // for(let i = 0; i < locks.length; i++){
      //   let lock = await program.account.lockState.fetch(locks[i])
      //   lockStates.push(lock)
      //   console.log(lock)
      // }
      // console.log(locks)

      const baseMint = NATIVE_MINT
      const userAta = await getAssociatedTokenAddress(
        mint, user.publicKey
      )

      const transaction = new Transaction()

      const vaultAta = await getAssociatedTokenAddress(mint, lockState, true)

      console.log("VaultAta:", vaultAta.toBase58())
      if (await connection.getAccountInfo(vaultAta) == null) {
        console.log("User lock lp token for a first time")
        transaction.add(createAssociatedTokenAccountInstruction(
          user.publicKey,
          vaultAta,
          lockState,
          mint
        ))
      }

      const instruction = await program.methods
        .lock(new BN(0), amount.div(new BN(2)), new BN(1200))
        .accounts({
          globalState,
          vaultAta,
          lockState,
          baseMint,
          userAta,
          lpMint: mint,
          owner: user.publicKey,
          pool: poolId,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId
        })
        .instruction()
        
      transaction.add(instruction)
      transaction.feePayer = user.publicKey
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      console.log(await connection.simulateTransaction(transaction))
      const sig = await sendAndConfirmTransaction(connection, transaction, [user])
      console.log({sig})
      setTimeout(async () => {
        console.log("trying to get the token balance of user wallet")
        const balInfo = await connection.getTokenAccountBalance(userAta)
        console.log("user wallet token balance is : ", balInfo.value.uiAmount)

        const vaultBalInfo = await connection.getTokenAccountBalance(vaultAta)
        console.log("locked vault token balance is : ", vaultBalInfo.value.uiAmount)

        const globalStateValue = await program.account.globalState.fetch(globalState)
        console.log("Now globalStateValue :\n", globalStateValue)

        const lockStateValue = await program.account.lockState.fetch(lockState)
        console.log("Newly create lock state value of user is :\n", lockState)
      }, 1000);

    } catch (error) {
      console.log("error in lock transaction :", error)
    }
  })

  it("Lock lp token 2", async () => {
      console.log("Trying to lock 30% of all lp token to 2")
    try {
      const [globalState] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        program.programId
      )

      const lockStates = await program.account.lockState.all()
      // const lockSeed = lockSeeds[lockStates.length]
      const [lockState] = PublicKey.findProgramAddressSync(
        [user.publicKey.toBuffer(), mint.toBuffer(), new anchor.BN(5).toArrayLike(Buffer, "le", 8)],
        program.programId
      )

      // const locks = await program.account.lockState.all()
      // const lockStates = []
      // for(let i = 0; i < locks.length; i++){
      //   let lock = await program.account.lockState.fetch(locks[i])
      //   lockStates.push(lock)
      //   console.log(lock)
      // }
      // console.log(locks)

      const baseMint = NATIVE_MINT
      const userAta = await getAssociatedTokenAddress(
        mint, user.publicKey
      )

      const transaction = new Transaction()

      const vaultAta = await getAssociatedTokenAddress(mint, lockState, true)

      console.log("VaultAta:", vaultAta.toBase58())
      if (await connection.getAccountInfo(vaultAta) == null) {
        console.log("User lock lp token for a first time")
        transaction.add(createAssociatedTokenAccountInstruction(
          user.publicKey,
          vaultAta,
          lockState,
          mint
        ))
      }

      const instruction = await program.methods
        .lock(new BN(5), amount.div(new BN(4)), new BN(86400 * 3))
        .accounts({
          globalState,
          vaultAta,
          lockState,
          baseMint,
          userAta,
          lpMint: mint,
          owner: user.publicKey,
          pool: poolId,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId
        })
        .instruction()
        
      transaction.add(instruction)
      transaction.feePayer = user.publicKey
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      console.log(await connection.simulateTransaction(transaction))
      await sendAndConfirmTransaction(connection, transaction, [user])
      setTimeout(async () => {
        console.log("trying to get the token balance of user wallet")
        const balInfo = await connection.getTokenAccountBalance(userAta)
        console.log("user wallet token balance is : ", balInfo.value.uiAmount)

        const vaultBalInfo = await connection.getTokenAccountBalance(vaultAta)
        console.log("locked vault token balance is : ", vaultBalInfo.value.uiAmount)

        const globalStateValue = await program.account.globalState.fetch(globalState)
        console.log("Now globalStateValue :\n", globalStateValue)

        const lockStateValue = await program.account.lockState.fetch(lockState)
        console.log("Newly create lock state value of user is :\n", lockState)
      }, 1000);

    } catch (error) {
      console.log("error in lock transaction :", error)
    }
  })
  
  it("Withdraw locked LP token from vault", async () => {
    console.log("Trying to withdraw lp token from vault (after lock period)")
    console.log("Here, this transaction fails, because lock period set to 2 days, but it is not expired")
    try {
      const id = new BN(0)
      const [globalState] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        program.programId
      )

      const [lockState, bump] = PublicKey.findProgramAddressSync(
        [user.publicKey.toBuffer(), mint.toBuffer(), id.toArrayLike(Buffer, "le", 8)],
        program.programId
      )

      console.log("lockState:", lockState.toBase58())

      const userAta = await getAssociatedTokenAddress(
        mint, user.publicKey
      )

      const [vaultAta] = await PublicKey.findProgramAddress(
        [lockState.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log("VaultAta:", vaultAta.toBase58())

      if (await connection.getAccountInfo(vaultAta) == null)
        throw new Error("LP token vault does not exist")

      const transaction = await program.methods
        .withdraw(id, bump)
        .accounts({
          globalState,
          vaultAta,
          lockState,
          userAta,
          lpMint: mint,
          owner: user.publicKey,
          pool: poolId,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId
        })
        .transaction()

      transaction.feePayer = user.publicKey
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      console.log(await connection.simulateTransaction(transaction))
      const sig = await sendAndConfirmTransaction(connection, transaction, [user])
        console.log({sig})
      setTimeout(async () => {
        console.log("trying to get the balance of user wallet")
        const balInfo = await connection.getTokenAccountBalance(userAta)
        console.log("user token balance : ", balInfo.value.uiAmount)
        const vaultBalInfo = await connection.getTokenAccountBalance(vaultAta)
        console.log("vault token balance : ", vaultBalInfo.value.uiAmount)
        const globalStateValue = await program.account.globalState.fetch(globalState)
        console.log("globalStateValue:", globalStateValue)
      }, 1000);

    } catch (error) {
      console.log("error in withdraw transaction :", error)
    }
  })

  it("increase lock amount ( admin function )", async () => {
    console.log("Trying to increase lock amount, lock 25% more of his token")
    try {
      const id = new BN(0)
      const [globalState] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        program.programId
      )
      const [lockState] = PublicKey.findProgramAddressSync(
        [user.publicKey.toBuffer(), mint.toBuffer(), id.toArrayLike(Buffer, "le", 8)],
        program.programId
      )

      const userAta = await getAssociatedTokenAddress(
        mint, user.publicKey
      )

      const vaultAta = await getAssociatedTokenAddress(mint, lockState, true)

      console.log("VaultAta:", vaultAta.toBase58())

      if (await connection.getAccountInfo(vaultAta) == null) {
        throw new Error("Unable to detect lp token vault")
      }

      const transaction = await program.methods
        .increaseLockAmount(id, amount.div(new BN(10)))
        .accounts({
          globalState,
          vaultAta,
          lockState,
          userAta,
          lpMint: mint,
          owner: user.publicKey,
          pool: poolId,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId
        })
        .transaction()

      transaction.feePayer = user.publicKey
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      console.log(await connection.simulateTransaction(transaction))
      await sendAndConfirmTransaction(connection, transaction, [user])
      setTimeout(async () => {
        console.log("trying to get the balance of user wallet")
        const balInfo = await connection.getTokenAccountBalance(userAta)
        console.log("user token balance : ", balInfo.value.uiAmount)
        const vaultBalInfo = await connection.getTokenAccountBalance(vaultAta)
        console.log("vault token balance : ", vaultBalInfo.value.uiAmount)
        const globalStateValue = await program.account.globalState.fetch(globalState)
        console.log("globalStateValue:", globalStateValue)
      }, 1000);

    } catch (error) {
      console.log("error in lock transaction :", error)
    }
  })

  // it("extend lock period", async () => {
  //   console.log("Extend lock time preiod to 12.5 hours more")
  //   try {
  //     const id = new BN(0)
  //     const [lockState] = PublicKey.findProgramAddressSync(
  //       [user.publicKey.toBuffer(), mint.toBuffer(), Buffer.from(lockSeeds[0])],
  //       program.programId
  //     )

  //     let lock = await program.account.lockState.fetch(lockState)
  //     console.log("lock end date:", lock.endDate.toString())
  //     const transaction = await program.methods
  //       .increaseLockTime(id, new BN(44000))
  //       .accounts({
  //         lockState,
  //         lpMint: mint,
  //         owner: user.publicKey,
  //         systemProgram: SystemProgram.programId
  //       })
  //       .transaction()

  //     transaction.feePayer = user.publicKey
  //     transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  //     console.log(await connection.simulateTransaction(transaction))
  //     await sendAndConfirmTransaction(connection, transaction, [user])
  //     lock = await program.account.lockState.fetch(lockState)
  //     console.log("lock end date:", lock.endDate.toString())
  //   } catch (error) {
  //     console.log("Error in extending lock duration", error)
  //   }
  // })

  it("extend lock period with failing simulation (shorter extend period)", async () => {
    console.log("Here, set the extend lock time to 10 hours to check whether it fails")
    try {
      const id = new BN(0)
      const [lockState] = PublicKey.findProgramAddressSync(
        [user.publicKey.toBuffer(), mint.toBuffer(), id.toArrayLike(Buffer, "le", 8)],
        program.programId
      )
      let lock = await program.account.lockState.fetch(lockState)
      console.log("lock end date:", lock.endDate.toString())
      const transaction = await program.methods
        .increaseLockTime(id, new BN(80000))
        .accounts({
          lockState,
          lpMint: mint,
          owner: user.publicKey,
          systemProgram: SystemProgram.programId
        })
        .transaction()

      transaction.feePayer = user.publicKey
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      console.log(await connection.simulateTransaction(transaction))
      await sendAndConfirmTransaction(connection, transaction, [user])
      lock = await program.account.lockState.fetch(lockState)
      console.log("lock end date:", lock.endDate.toString())
    } catch (error) {
      console.log("Error in extending lock duration", error)
      console.log("Increase lock period failed")
    }
  })

  it("change admin to user2", async () => {
    console.log("Trying to change the admin to another user")
    console.log("Currently, the admin is ", user.publicKey.toBase58())
    console.log("Will try to change admin to ", user2.publicKey.toBase58())
    try {
      const [globalState] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        program.programId
      )

      const tx = await program.methods.changeAdmin(user2.publicKey)
        .accounts({
          admin: user.publicKey,
          globalState,
          systemProgram: SystemProgram.programId
        })
        .signers([user])
        .transaction()
      tx.feePayer = user.publicKey
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      console.log(await connection.simulateTransaction(tx))
      await sendAndConfirmTransaction(connection, tx, [user])

      const globalStateValue = await program.account.globalState.fetch(globalState)
      console.log("Transaction of admin change success\n")
      console.log("step1: now admin is : ", globalStateValue.admin.toBase58())
    } catch (error) {
      console.log("error in changing admin :", error)
    }
  })

  it("change admin back to user", async () => {
    console.log("Trying to change admin back to original user")
    try {
      const [globalState] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        program.programId
      )

      const tx = await program.methods.changeAdmin(user.publicKey)
        .accounts({
          admin: user2.publicKey,
          globalState,
          systemProgram: SystemProgram.programId
        })
        .signers([user2])
        .transaction()
      tx.feePayer = user2.publicKey
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      console.log(await connection.simulateTransaction(tx))
      await sendAndConfirmTransaction(connection, tx, [user2])

      const globalStateValue = await program.account.globalState.fetch(globalState)
      console.log("step2: now admin is back to : ", globalStateValue.admin.toBase58())
    } catch (error) {
      console.log("error in changing admin :", error)
    }
  })

  it("change minimum lock period", async () => {
    console.log("Trying to change minimum lock period")

    try {
      const [globalState] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        program.programId
      )

      const tx = await program.methods.changeLockPeriod(new BN(900))
        .accounts({
          admin: user.publicKey,
          globalState,
          systemProgram: SystemProgram.programId
        })
        .signers([user])
        .transaction()
      tx.feePayer = user.publicKey
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      console.log(await connection.simulateTransaction(tx))
      await sendAndConfirmTransaction(connection, tx, [user])

      const globalStateValue = await program.account.globalState.fetch(globalState)
      console.log("now minimum lock duration is : ", globalStateValue.minimumLockDuration.toString(), " seconds")
      console.log("which is ", Number(globalStateValue.minimumLockDuration.toString()) / 86400, " day(s)")
    } catch (error) {
      console.log("error in changing minimum lock period :", error)
    }
  })

  it("change minimum lock amount in percent", async () => {
    console.log("Trying to change minimum lock amount in percent")
    try {
      const [globalState] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        program.programId
      )

      const tx = await program.methods.changeLockPercent(new BN(1))
        .accounts({
          admin: user.publicKey,
          globalState,
          systemProgram: SystemProgram.programId
        })
        .signers([user])
        .transaction()
      tx.feePayer = user.publicKey
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      console.log(await connection.simulateTransaction(tx))
      await sendAndConfirmTransaction(connection, tx, [user])

      const globalStateValue = await program.account.globalState.fetch(globalState)
      console.log("now the minimum lock amount is ", globalStateValue.minimumLockPercent)

    } catch (error) {
      console.log("error in changing minimum lock percent :", error)
    }
  })

  it("Withdraw finally", async () => {
    const id = new BN(0)
    console.log("Assuming that the we are waiting for a lock time to be expired, for example 2 days,")
    console.log("But in this contract, for a test purpose, it's set to 105 seconds, so plz let us wait for 100 sec")
    console.log("In contract, the minimum lock time is 100 seconds, so it should withdraw well")

    await sleep(55000)
    console.log("50 seconds remained")
    await sleep(50000)
    console.log("Time's up! \n Trying to withdraw lp token from vault (after lock period)")
    console.log("Here, this transaction suceeds, because lock period ended")
    try {
      const [globalState] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        program.programId
      )

      const [lockState, bump] = PublicKey.findProgramAddressSync(
        [user.publicKey.toBuffer(), mint.toBuffer(), id.toArrayLike(Buffer, "le", 8)],
        program.programId
      )

      console.log("lockState:", lockState.toBase58())

      const userAta = await getAssociatedTokenAddress(
        mint, user.publicKey
      )

      const [vaultAta] = await PublicKey.findProgramAddress(
        [lockState.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log("VaultAta:", vaultAta.toBase58())

      if (await connection.getAccountInfo(vaultAta) == null)
        throw new Error("LP token vault does not exist")

      const transaction = await program.methods
        .withdraw(id, bump)
        .accounts({
          globalState,
          vaultAta,
          lockState,
          userAta,
          lpMint: mint,
          owner: user.publicKey,
          pool: poolId,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId
        })
        .transaction()

      transaction.feePayer = user.publicKey
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      console.log(await connection.simulateTransaction(transaction))
      await sendAndConfirmTransaction(connection, transaction, [user])

      setTimeout(async () => {
        console.log("Trying to get the balance of user wallet")
        const balInfo = await connection.getTokenAccountBalance(userAta)
        console.log("user token balance : ", balInfo.value.uiAmount)
        const vaultBalInfo = await connection.getTokenAccountBalance(vaultAta)
        console.log("vault token balance : ", vaultBalInfo.value.uiAmount)
        console.log("\nSuccessfully withdrawn\n")
        const globalStateValue = await program.account.globalState.fetch(globalState)
        console.log("globalStateValue:", globalStateValue)
      }, 1000);

    } catch (error) {
      console.log("error in withdraw transaction :", error)
    }
  })

});



