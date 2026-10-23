import { FaLock } from "react-icons/fa";
import '../../styles/authlogin.css';


export default function AuthLogin(){
    return(
        <div className="body login">
            <div className="inner">
                <div className="key-circle">
                    <FaLock />
                </div>
                <div className="below">
                                    <p>Verify Your OTP</p>
                <p>We&apos;ve sent you six digits to</p>
                <p>+245 XXX XX 95</p>
                
                </div>
            </div>
        </div>
    )
}