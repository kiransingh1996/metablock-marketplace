import { createContext, useState, useEffect } from 'react'
import { useMoralis, useMoralisQuery } from 'react-moralis'
import { amazonAbi, amazonCoinAddress } from '../lib/constants'
import { ethers } from 'ethers'

export const AmazonContext = createContext()

export const AmazonProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState('')
  const [formattedAccount, setFormattedAccount] = useState('')
  const [balance, setBalance] = useState('')
  const [tokenAmount, setTokenAmount] = useState('')
  const [amountDue, setAmountDue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [etherscanLink, setEtherscanLink] = useState('')
  const [nickname, setNickname] = useState('')
  const [username, setUsername] = useState('')
  const [assets, setAssets] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [ownedItems, setOwnedItems] = useState([])

  const {
    authenticate,
    isAuthenticated,
    enableWeb3,
    Moralis,
    user,
    isWeb3Enabled,
  } = useMoralis()

  const {
    data: userData,
    error: userDataError,
    isLoading: userDataIsLoading,
  } = useMoralisQuery('_User')

  const {
    data: assetsData,
    error: assetsDataError,
    isLoading: assetsDataIsLoading,
  } = useMoralisQuery('assets')

  useEffect(() => { 
    ;(async()=>{ 
      if(isWeb3Enabled){
        await getAssets()
        await getOwnedAssets()
      }
      else{
        await enableWeb3()
      }
    })();
  }, [ isAuthenticated, userData, assetsData, assetsDataIsLoading, userDataIsLoading]);

  useEffect(() => {
    ;(async()=>{
      if (!isWeb3Enabled) {
        await enableWeb3()
      }
      await listenToUpdates()
  
      if (isAuthenticated) {
        await getBalance()
        const currentUsername = await user?.get('nickname')
        setUsername(currentUsername)
        const account = await user?.get('ethAddress')
        setCurrentAccount(account)
        const formatAccount = account.slice(0, 5) + '...' + account.slice(-5)
        setFormattedAccount(formatAccount)
      } else {
        setCurrentAccount('')
        setFormattedAccount('')
        setBalance('')
      }
    })(); 
  }, [
    isWeb3Enabled,
    isAuthenticated,
    balance,
    setBalance,
    authenticate,
    currentAccount,
    setUsername,
    user,
    username,
  ]);

  const connectWallet = async () => {
    await enableWeb3()
    await authenticate()
  }

  const buyTokens = async () => {
    if (!isAuthenticated) {
      await connectWallet()
    }

    const amount = ethers.BigNumber.from(tokenAmount)
    const price = ethers.BigNumber.from('100000000000')
    const calcPrice = amount.mul(price) 
    debugger;
    let options = {
      contractAddress: amazonCoinAddress,
      functionName: 'mint',
      abi: amazonAbi,
      msgValue: calcPrice,
      params: {
        amount,
      },
    }
    const transaction = await Moralis.executeFunction(options)
    debugger;
    const receipt = await transaction.wait()
    setIsLoading(false)
    
    setEtherscanLink(
      `https://ropsten.etherscan.io/tx/${receipt.transactionHash}`,
    )
  }

  const handleSetUsername = () => {
    if (user) {
      if (nickname) {
        user.set('nickname', nickname)
        user.save()
        setNickname('')
      } else {
        console.log("Can't set empty nickname")
      }
    } else {
      console.log('No user')
    }
  }

  const getBalance = async () => {
    try {
      if (!isAuthenticated || !currentAccount) return
      const options = {
        contractAddress: amazonCoinAddress,
        functionName: 'balanceOf',
        abi: amazonAbi,
        params: {
          account: currentAccount,
        },
      }

      if (isWeb3Enabled) {
        const response = await Moralis.executeFunction(options)
        setBalance((response/1000000000000000000).toFixed())
      }
    } catch (error) {
      console.log(error)
    }
  }

  const buyAsset = async (price, asset) => {
    try {
      if (!isAuthenticated) return  
      const options = {
        type: 'erc20',
        amount: price,
        receiver: amazonCoinAddress,
        contractAddress: amazonCoinAddress,
      }

      let transaction = await Moralis.transfer(options)
      const receipt = await transaction.wait()

      if (receipt) { 
        const res = userData[0].add('ownedAssets', {
          ...asset,
          purchaseDate: Date.now(),
          etherscanLink: `https://rinkeby.etherscan.io/tx/${receipt.transactionHash}`,
        })

        await res.save().then(() => {
          alert("You've successfully purchased this asset!")
        })
      }
    } catch (error) {
      console.log(error.message)
    }
  }

  const getAssets = async () => {
    try {
      await enableWeb3() 

      setAssets(assetsData)
    } catch (error) {
      console.log(error)
    }
  }

  const listenToUpdates = async () => {
    let query = new Moralis.Query('EthTransactions')
    let subscription = await query.subscribe()
    subscription.on('update', async object => {
      console.log('New Transactions')
      console.log(object)
      setRecentTransactions([object])
    })
  }

  const getOwnedAssets = async () => {
    try { 
      if (userData[0]) {
        setOwnedItems(prevItems => [
          ...prevItems,
          userData[0].attributes.ownedAssets,
        ])
      }
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <AmazonContext.Provider
      value={{
        formattedAccount,
        isAuthenticated,
        buyTokens,
        getBalance,
        balance,
        setTokenAmount,
        tokenAmount,
        amountDue,
        setAmountDue,
        isLoading,
        setIsLoading,
        setEtherscanLink,
        etherscanLink,
        buyAsset,
        currentAccount,
        nickname,
        setNickname,
        username,
        setUsername,
        handleSetUsername,
        assets,
        recentTransactions,
        ownedItems,
      }}
    >
      {children}
    </AmazonContext.Provider>
  )
}
