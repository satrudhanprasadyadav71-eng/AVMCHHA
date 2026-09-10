import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    onValue,
    set,
    onDisconnect,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp as firestoreTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyD6N9qV-LhpYy_cxZbPB4RYGVUSSux_GzM",
    authDomain: "avmchha.firebaseapp.com",
    databaseURL: "https://avmchha-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "avmchha",
    storageBucket: "avmchha.firebasestorage.app",
    messagingSenderId: "903676112358",
    appId: "1:903676112358:web:99bb1c2fada589f22a3a27",
    measurementId: "G-57ZH5CSZPM"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const database = getDatabase(app);
const db = getFirestore(app);

let currentUser = null;
let friendUid = null;
let unsubscribeMessages = null;


// Firebase Login
signInAnonymously(auth)
    .then(() => {
        console.log("AVMCHHA Firebase connected!");
    })
    .catch((error) => {
        console.error("Login error:", error);
    });


// User State
onAuthStateChanged(auth, (user) => {

    if (!user) return;

    currentUser = user;

    console.log("Your UID:", user.uid);

    const myUid = document.getElementById("myUid");

    if (myUid) {
        myUid.textContent = user.uid;
    }


    // Online / Offline
    const myStatus = ref(database, "status/" + user.uid);
    const connectedRef = ref(database, ".info/connected");

    onValue(connectedRef, (snapshot) => {

        if (snapshot.val() === true) {

            onDisconnect(myStatus).set({
                state: "offline",
                lastChanged: serverTimestamp()
            });

            set(myStatus, {
                state: "online",
                lastChanged: serverTimestamp()
            });
        }
    });


    // Start Chat
    const startButton =
        document.getElementById("startChatButton");

    if (startButton) {

        startButton.addEventListener("click", () => {

            document.querySelector(".welcome").style.display = "none";

            document.getElementById("chatArea").style.display = "block";

        });
    }


    // Connect Friend
    const connectButton =
        document.getElementById("connectButton");

    if (connectButton) {

        connectButton.addEventListener("click", () => {

            const input =
                document.getElementById("friendUid");

            friendUid = input.value.trim();

            if (!friendUid) {
                alert("Please enter your friend's UID.");
                return;
            }

            if (friendUid === currentUser.uid) {
                alert("You cannot connect to your own UID.");
                return;
            }

            checkFriendStatus(friendUid);
            startMessages(friendUid);

        });
    }


    // Send Message
    const sendButton =
        document.getElementById("sendButton");

    if (sendButton) {
        sendButton.addEventListener("click", sendMessage);
    }


    // Enter to Send
    const messageInput =
        document.getElementById("messageInput");

    if (messageInput) {

        messageInput.addEventListener("keydown", (event) => {

            if (event.key === "Enter") {
                sendMessage();
            }

        });
    }

});


// Friend Status
function checkFriendStatus(uid) {

    const friendStatus =
        ref(database, "status/" + uid);

    onValue(friendStatus, (snapshot) => {

        const status = snapshot.val();

        const statusElement =
            document.getElementById("friendStatus");

        if (!statusElement) return;


        if (!status) {

            statusElement.textContent = "Offline";
            return;

        }


        if (status.state === "online") {

            statusElement.textContent = "Online";

        } else {

            statusElement.textContent =
                getLastSeenText(status.lastChanged);

        }

    });

}


// Last Seen
function getLastSeenText(lastChanged) {

    if (!lastChanged) {
        return "Offline";
    }

    const difference =
        Date.now() - lastChanged;

    const hours =
        Math.floor(
            difference / (1000 * 60 * 60)
        );


    if (hours <= 1) {
        return "H+";
    }

    if (hours === 2) {
        return "H++";
    }

    if (hours === 3) {
        return "H+++";
    }

    return "H" + hours + "+";
}


// Chat ID
function getChatId(uid1, uid2) {

    return [uid1, uid2].sort().join("_");

}


// Real-Time Messages
function startMessages(uid) {

    if (!currentUser) return;

    if (unsubscribeMessages) {
        unsubscribeMessages();
    }


    const chatId =
        getChatId(currentUser.uid, uid);


    const messagesRef =
        collection(
            db,
            "chats",
            chatId,
            "messages"
        );


    const messagesQuery =
        query(
            messagesRef,
            orderBy("createdAt", "asc")
        );


    unsubscribeMessages =
        onSnapshot(messagesQuery, (snapshot) => {

            const messages =
                document.getElementById("messages");

            if (!messages) return;

            messages.innerHTML = "";


            snapshot.forEach((doc) => {

                const message = doc.data();

                const div =
                    document.createElement("div");


                if (message.sender === currentUser.uid) {

                    div.textContent =
                        "You: " + message.text;

                } else {

                    div.textContent =
                        "Friend: " + message.text;

                }


                messages.appendChild(div);

            });

        }, (error) => {

            console.error(
                "Message error:",
                error
            );

        });

}


// Send Message
async function sendMessage() {

    if (!currentUser) {
        alert("Please wait for Firebase to connect.");
        return;
    }


    if (!friendUid) {
        alert(
            "First enter your friend's UID and press Connect."
        );
        return;
    }


    const input =
        document.getElementById("messageInput");

    const text =
        input.value.trim();


    if (!text) return;


    try {

        const chatId =
            getChatId(
                currentUser.uid,
                friendUid
            );


        await addDoc(
            collection(
                db,
                "chats",
                chatId,
                "messages"
            ),
            {
                sender: currentUser.uid,
                receiver: friendUid,
                text: text,
                createdAt: firestoreTimestamp()
            }
        );


        input.value = "";


    } catch (error) {

        console.error(
            "Send message error:",
            error
        );

        alert(
            "Message could not be sent."
        );

    }

}
