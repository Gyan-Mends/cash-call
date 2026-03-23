import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    type ModalProps,
} from "@heroui/react"
import { type ReactNode } from "react"

interface Props extends ModalProps {
    footer?: ReactNode
    title?: string
}

export const ConfirmModal = (props: Props) => {
    return (
        <Modal scrollBehavior='inside' backdrop='blur' {...props}>
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className='flex flex-col gap-1 text-base capitalize'>
                            {props.title}
                        </ModalHeader>
                        <ModalBody>{props.children}</ModalBody>
                        <ModalFooter>
                            <Button onPress={onClose} size='sm'>
                                Close
                            </Button>

                            {props.footer}
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    )
}

export const FormModal = (props: Props) => {
    return (
        <Modal scrollBehavior='inside' backdrop='blur' {...props}>
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className='flex flex-col gap-1 text-base'>
                            {props.title}
                        </ModalHeader>
                        <ModalBody>{props.children}</ModalBody>
                        {props.footer && (
                            <ModalFooter>
                                <Button onPress={onClose} size='sm'>
                                    Close
                                </Button>
                                {props.footer}
                            </ModalFooter>
                        )}
                    </>
                )}
            </ModalContent>
        </Modal>
    )
}
